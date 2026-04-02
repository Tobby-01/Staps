import { env } from "../config/env.js";
import { ROLES } from "../constants/roles.js";
import { VENDOR_SELLING_STATUS } from "../constants/vendor.js";
import { User } from "../models/user.model.js";
import { Vendor } from "../models/vendor.model.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";

import {
  createTransferRecipient,
  initializeTransaction,
  listBanks,
  resolveAccountNumber,
} from "../services/paystack.service.js";
import {
  hasCloudflareImagesConfig,
  uploadImageToCloudflare,
} from "../services/cloudflare-images.service.js";
import { finalizePaystackPayment } from "../services/payment.service.js";
import { syncVendorSellingAccess } from "../services/vendor-access.service.js";

const sanitizeAccountNumber = (value = "") => String(value).replace(/\D/g, "");

const parsePayoutAccountNumber = (
  value,
  { requiredError = "Payout account number is required." } = {},
) => {
  const normalized = sanitizeAccountNumber(value);

  if (!normalized) {
    throw new ApiError(400, requiredError);
  }

  if (normalized.length !== 10) {
    throw new ApiError(400, "Payout account number must be 10 digits.");
  }

  return normalized;
};

export const getVendorProfile = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user.id }).populate(
    "user",
    "name email role avatarUrl username",
  );
  await syncVendorSellingAccess(vendor);

  res.json({
    success: true,
    vendor,
  });
});

export const applyVendor = asyncHandler(async (req, res) => {
  const { name, phone, payoutAccountNumber } = req.body;

  if (!name || !phone) {
    throw new ApiError(400, "Name and phone are required.");
  }

  const normalizedPayoutAccountNumber = parsePayoutAccountNumber(payoutAccountNumber);

  if (!req.file) {
    throw new ApiError(400, "ID document upload is required.");
  }

  let vendor = await Vendor.findOne({ user: req.user.id });

  if (vendor) {
    const currentPayoutAccount =
      typeof vendor.payoutAccount?.toObject === "function"
        ? vendor.payoutAccount.toObject()
        : vendor.payoutAccount || {};
    const currentPayoutAccountNumber = sanitizeAccountNumber(currentPayoutAccount.accountNumber);
    const accountNumberChanged =
      Boolean(currentPayoutAccountNumber) &&
      currentPayoutAccountNumber !== normalizedPayoutAccountNumber;

    if (accountNumberChanged && currentPayoutAccount.setupComplete) {
      throw new ApiError(
        400,
        "Payout account is already configured. Update it from your vendor dashboard payout setup.",
      );
    }

    vendor.name = name;
    vendor.phone = phone;
    vendor.idDocumentUrl = `/uploads/vendor-docs/${req.file.filename}`;
    vendor.verified = false;
    vendor.payoutAccount = {
      ...currentPayoutAccount,
      accountNumber: normalizedPayoutAccountNumber,
      currency: currentPayoutAccount.currency || "NGN",
    };

    if (accountNumberChanged && !currentPayoutAccount.setupComplete) {
      vendor.payoutAccount.bankCode = "";
      vendor.payoutAccount.bankName = "";
      vendor.payoutAccount.accountName = "";
      vendor.payoutAccount.recipientCode = "";
      vendor.payoutAccount.recipientId = undefined;
      vendor.payoutAccount.setupComplete = false;
      vendor.payoutAccount.lastSyncedAt = undefined;
    }

    await vendor.save();
  } else {
    vendor = await Vendor.create({
      user: req.user.id,
      name,
      phone,
      idDocumentUrl: `/uploads/vendor-docs/${req.file.filename}`,
      payoutAccount: {
        accountNumber: normalizedPayoutAccountNumber,
        currency: "NGN",
        setupComplete: false,
      },
    });
  }

  if (req.user.role !== ROLES.VENDOR) {
    req.user.role = ROLES.VENDOR;
    await req.user.save();
  }

  res.status(201).json({
    success: true,
    message: "Vendor application submitted. Complete registration payment next.",
    vendor,
  });
});

export const initializeVendorFee = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user.id });
  if (!vendor) {
    throw new ApiError(404, "Submit vendor details before making payment.");
  }

  const transaction = await initializeTransaction({
    email: req.user.email,
    amount: env.vendorRegistrationFee * 100,
    metadata: {
      type: "vendor_registration",
      userId: req.user.id,
    },
  });

  vendor.registrationReference = transaction.reference;
  await vendor.save();

  res.json({
    success: true,
    payment: transaction,
  });
});

export const verifyVendorFee = asyncHandler(async (req, res) => {
  const { reference } = req.params;
  const vendor = await Vendor.findOne({ user: req.user.id });
  if (!vendor) {
    throw new ApiError(404, "Vendor application not found.");
  }

  const result = await finalizePaystackPayment(reference);
  if (result.intent !== "vendor_registration") {
    throw new ApiError(400, "This payment reference does not belong to a vendor registration.");
  }

  res.json({
    success: true,
    message: result.message,
    vendor: result.vendor,
  });
});

export const listVerifiedVendors = asyncHandler(async (_req, res) => {
  const vendors = await Vendor.find({ verified: true }).populate("user", "name email");
  await Promise.all(vendors.map((vendor) => syncVendorSellingAccess(vendor)));

  res.json({
    success: true,
    vendors: vendors.filter(
      (vendor) => vendor.sellingStatus === VENDOR_SELLING_STATUS.ACTIVE,
    ),
  });
});

export const listPayoutBanks = asyncHandler(async (_req, res) => {
  const banks = await listBanks("NGN");

  res.json({
    success: true,
    banks,
  });
});

export const setupVendorPayout = asyncHandler(async (req, res) => {
  const { bankCode, accountNumber } = req.body;
  const normalizedAccountNumber = parsePayoutAccountNumber(accountNumber, {
    requiredError: "Bank code and account number are required.",
  });
  const vendor = await Vendor.findOne({ user: req.user.id });

  if (!vendor) {
    throw new ApiError(404, "Vendor profile not found.");
  }

  if (!bankCode) {
    throw new ApiError(400, "Bank code and account number are required.");
  }

  const resolvedAccount = await resolveAccountNumber({
    accountNumber: normalizedAccountNumber,
    bankCode,
  });
  const recipient = await createTransferRecipient({
    name: vendor.name,
    accountNumber: normalizedAccountNumber,
    bankCode,
    currency: "NGN",
  });

  vendor.payoutAccount = {
    bankCode,
    bankName: recipient.details?.bank_name || vendor.payoutAccount?.bankName || "",
    accountNumber: normalizedAccountNumber,
    accountName: resolvedAccount.account_name,
    recipientCode: recipient.recipient_code,
    recipientId: recipient.id,
    currency: recipient.currency || "NGN",
    setupComplete: true,
    lastSyncedAt: new Date(),
  };
  await vendor.save();

  res.json({
    success: true,
    message: "Vendor payout account saved successfully.",
    payoutAccount: vendor.payoutAccount,
  });
});

export const updateVendorBranding = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user.id });
  if (!vendor) {
    throw new ApiError(404, "Vendor profile not found.");
  }

  const nextStoreName = req.body.name?.trim();
  if (!nextStoreName && !req.file) {
    throw new ApiError(400, "Add a store name or profile photo before saving.");
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  if (nextStoreName) {
    vendor.name = nextStoreName;
    user.name = nextStoreName;
  }

  if (req.file) {
    let uploadedAvatar = null;

    if (hasCloudflareImagesConfig()) {
      uploadedAvatar = await uploadImageToCloudflare(req.file, {
        type: "vendor-avatar",
        userId: user.id,
        vendorId: vendor.id,
      });
    }

    user.avatarUrl = uploadedAvatar?.url || `/uploads/avatars/${req.file.filename}`;
  }

  vendor.brandingUpdatedAt = new Date();

  await Promise.all([vendor.save(), user.save()]);

  const populatedVendor = await Vendor.findOne({ user: req.user.id }).populate(
    "user",
    "name email role avatarUrl username",
  );

  res.json({
    success: true,
    message: "Store identity updated successfully.",
    vendor: populatedVendor,
  });
});
