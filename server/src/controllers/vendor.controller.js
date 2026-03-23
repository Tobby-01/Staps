import { env } from "../config/env.js";
import { ROLES } from "../constants/roles.js";
import { Vendor } from "../models/vendor.model.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";

import {
  createTransferRecipient,
  initializeTransaction,
  listBanks,
  resolveAccountNumber,
} from "../services/paystack.service.js";
import { finalizePaystackPayment } from "../services/payment.service.js";

export const getVendorProfile = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user.id }).populate("user", "name email role");

  res.json({
    success: true,
    vendor,
  });
});

export const applyVendor = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;

  if (!name || !phone) {
    throw new ApiError(400, "Name and phone are required.");
  }

  if (!req.file) {
    throw new ApiError(400, "ID document upload is required.");
  }

  let vendor = await Vendor.findOne({ user: req.user.id });

  if (vendor) {
    vendor.name = name;
    vendor.phone = phone;
    vendor.idDocumentUrl = `/uploads/vendor-docs/${req.file.filename}`;
    vendor.verified = false;
    await vendor.save();
  } else {
    vendor = await Vendor.create({
      user: req.user.id,
      name,
      phone,
      idDocumentUrl: `/uploads/vendor-docs/${req.file.filename}`,
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

  res.json({
    success: true,
    vendors,
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
  const vendor = await Vendor.findOne({ user: req.user.id });

  if (!vendor) {
    throw new ApiError(404, "Vendor profile not found.");
  }

  if (!bankCode || !accountNumber) {
    throw new ApiError(400, "Bank code and account number are required.");
  }

  const resolvedAccount = await resolveAccountNumber({ accountNumber, bankCode });
  const recipient = await createTransferRecipient({
    name: vendor.name,
    accountNumber,
    bankCode,
    currency: "NGN",
  });

  vendor.payoutAccount = {
    bankCode,
    bankName: recipient.details?.bank_name || vendor.payoutAccount?.bankName || "",
    accountNumber,
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
