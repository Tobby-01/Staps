import { ROLES } from "../constants/roles.js";
import { User } from "../models/user.model.js";
import { WalletTransaction } from "../models/wallet-transaction.model.js";
import { ApiError } from "../utils/api-error.js";
import {
  createCustomer,
  createDedicatedAccount,
  listCustomersByEmail,
} from "./paystack.service.js";

const normalizeWalletAmount = (value, { fieldName = "Amount" } = {}) => {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    throw new ApiError(400, `${fieldName} must be a valid number.`);
  }

  const normalizedAmount = Math.round(parsedValue);
  if (normalizedAmount <= 0) {
    throw new ApiError(400, `${fieldName} must be greater than zero.`);
  }

  return normalizedAmount;
};

const getWalletUserById = async (userId) => {
  const user = await User.findById(userId).select(
    "walletBalance role name email walletFundingAccount",
  );
  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  return user;
};

const formatFundingAccountPayload = (walletFundingAccount) => {
  if (!walletFundingAccount?.accountNumber) {
    return null;
  }

  return {
    provider: walletFundingAccount.provider || "paystack",
    accountNumber: walletFundingAccount.accountNumber,
    accountName: walletFundingAccount.accountName || "",
    bankName: walletFundingAccount.bankName || "",
    bankCode: walletFundingAccount.bankCode || "",
    currency: walletFundingAccount.currency || "NGN",
    active: walletFundingAccount.active !== false,
    assignedAt: walletFundingAccount.assignedAt || null,
    lastSyncedAt: walletFundingAccount.lastSyncedAt || null,
  };
};

const splitName = (name = "") => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) {
    return { firstName: "STAPS", lastName: "Shopper" };
  }

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "Shopper" };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
};

const normalizeDedicatedAccountPayload = (value = {}) => {
  if (!value?.account_number) {
    return null;
  }

  return {
    dedicatedAccountId: Number(value.id) || undefined,
    accountNumber: value.account_number || "",
    accountName: value.account_name || "",
    bankName: value.bank?.name || "",
    bankCode: value.bank?.slug || "",
    currency: value.currency || "NGN",
    active: value.active !== false,
    assignedAt: value.created_at ? new Date(value.created_at) : new Date(),
    lastSyncedAt: new Date(),
  };
};

export const ensureShopperWalletAccess = async (userId) => {
  const user = await getWalletUserById(userId);
  if (user.role !== ROLES.USER) {
    throw new ApiError(403, "Wallet is only available for shopper accounts.");
  }

  return user;
};

export const creditWallet = async ({
  userId,
  amount,
  type,
  description,
  reference = "",
  metadata = {},
}) => {
  const normalizedAmount = normalizeWalletAmount(amount);
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $inc: { walletBalance: normalizedAmount } },
    { new: true, runValidators: true, select: "walletBalance role name email" },
  );

  if (!updatedUser) {
    throw new ApiError(404, "User not found.");
  }

  const balanceAfter = Math.max(0, Math.round(Number(updatedUser.walletBalance || 0)));
  const balanceBefore = Math.max(0, balanceAfter - normalizedAmount);

  const transaction = await WalletTransaction.create({
    user: userId,
    type,
    direction: "credit",
    amount: normalizedAmount,
    balanceBefore,
    balanceAfter,
    reference: reference || undefined,
    description,
    metadata,
  });

  return {
    balance: balanceAfter,
    transaction,
    user: updatedUser,
  };
};

export const debitWallet = async ({
  userId,
  amount,
  type,
  description,
  reference = "",
  metadata = {},
}) => {
  const normalizedAmount = normalizeWalletAmount(amount);
  const updatedUser = await User.findOneAndUpdate(
    {
      _id: userId,
      walletBalance: { $gte: normalizedAmount },
    },
    {
      $inc: { walletBalance: -normalizedAmount },
    },
    {
      new: true,
      runValidators: true,
      select: "walletBalance role name email",
    },
  );

  if (!updatedUser) {
    const existingUser = await User.findById(userId).select("_id");
    if (!existingUser) {
      throw new ApiError(404, "User not found.");
    }

    throw new ApiError(400, "Insufficient wallet balance. Fund your wallet to continue.");
  }

  const balanceAfter = Math.max(0, Math.round(Number(updatedUser.walletBalance || 0)));
  const balanceBefore = balanceAfter + normalizedAmount;

  const transaction = await WalletTransaction.create({
    user: userId,
    type,
    direction: "debit",
    amount: normalizedAmount,
    balanceBefore,
    balanceAfter,
    reference: reference || undefined,
    description,
    metadata,
  });

  return {
    balance: balanceAfter,
    transaction,
    user: updatedUser,
  };
};

export const listWalletTransactions = async (userId, { limit = 25 } = {}) => {
  const normalizedLimit = Math.max(1, Math.min(100, Number(limit) || 25));
  return WalletTransaction.find({ user: userId }).sort({ createdAt: -1 }).limit(normalizedLimit).lean();
};

export const getWalletSummary = async (userId, { limit = 25 } = {}) => {
  const user = await ensureShopperWalletAccess(userId);
  const transactions = await listWalletTransactions(userId, { limit });

  return {
    balance: Math.max(0, Math.round(Number(user.walletBalance || 0))),
    currency: "NGN",
    fundingAccount: formatFundingAccountPayload(user.walletFundingAccount),
    transactions,
  };
};

export const getWalletFundingAccount = async (userId) => {
  const user = await ensureShopperWalletAccess(userId);

  return formatFundingAccountPayload(user.walletFundingAccount);
};

export const provisionWalletFundingAccount = async (userId) => {
  const user = await ensureShopperWalletAccess(userId);

  if (user.walletFundingAccount?.accountNumber) {
    return formatFundingAccountPayload(user.walletFundingAccount);
  }

  const { firstName, lastName } = splitName(user.name);
  let customerCode = user.walletFundingAccount?.customerCode || "";

  if (!customerCode) {
    const existingCustomers = await listCustomersByEmail(user.email);
    const matchedCustomer = Array.isArray(existingCustomers)
      ? existingCustomers.find((entry) => entry?.customer_code)
      : null;

    if (matchedCustomer?.customer_code) {
      customerCode = matchedCustomer.customer_code;

      const existingDedicatedAccount = normalizeDedicatedAccountPayload(
        matchedCustomer.dedicated_account || {},
      );

      if (existingDedicatedAccount?.accountNumber) {
        user.walletFundingAccount = {
          provider: "paystack",
          customerCode,
          ...existingDedicatedAccount,
        };
        await user.save();
        return formatFundingAccountPayload(user.walletFundingAccount);
      }
    } else {
      const createdCustomer = await createCustomer({
        email: user.email,
        firstName,
        lastName,
      });
      customerCode = createdCustomer.customer_code;
    }
  }

  if (!customerCode) {
    throw new ApiError(502, "Could not create a wallet funding profile at the moment.");
  }

  let dedicatedAccount = null;

  try {
    dedicatedAccount = await createDedicatedAccount({
      customerCode,
    });
  } catch (error) {
    if (/dedicated\s*nuban\s+is\s+not\s+available/i.test(String(error?.message || ""))) {
      throw new ApiError(
        400,
        "Personal funding accounts are not enabled on this payment profile yet. Enable Dedicated Virtual Accounts on Paystack or continue funding via Paystack checkout.",
      );
    }

    throw error;
  }

  const normalizedDedicatedAccount = normalizeDedicatedAccountPayload(dedicatedAccount || {});

  if (!normalizedDedicatedAccount?.accountNumber) {
    throw new ApiError(502, "Wallet funding account could not be created at the moment.");
  }

  user.walletFundingAccount = {
    provider: "paystack",
    customerCode,
    ...normalizedDedicatedAccount,
  };

  await user.save();

  return formatFundingAccountPayload(user.walletFundingAccount);
};

export const getWalletTransactionByReference = async ({ reference, type }) =>
  WalletTransaction.findOne({
    reference,
    ...(type ? { type } : {}),
  });
