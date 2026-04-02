import { ROLES } from "../constants/roles.js";
import { User } from "../models/user.model.js";
import { WalletTransaction } from "../models/wallet-transaction.model.js";
import { ApiError } from "../utils/api-error.js";

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
  const user = await User.findById(userId).select("walletBalance role name email");
  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  return user;
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
    transactions,
  };
};

export const getWalletTransactionByReference = async ({ reference, type }) =>
  WalletTransaction.findOne({
    reference,
    ...(type ? { type } : {}),
  });

