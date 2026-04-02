import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/api-error.js";

import { initializeTransaction } from "../services/paystack.service.js";
import {
  ensureShopperWalletAccess,
  getWalletFundingAccount,
  getWalletSummary,
  provisionWalletFundingAccount,
} from "../services/wallet.service.js";

export const getMyWallet = asyncHandler(async (req, res) => {
  const wallet = await getWalletSummary(req.user.id, {
    limit: req.query.limit,
  });

  res.json({
    success: true,
    wallet,
  });
});

export const initializeWalletFunding = asyncHandler(async (req, res) => {
  await ensureShopperWalletAccess(req.user.id);

  const amountValue = Number(req.body?.amount);
  const amount = Math.round(amountValue);

  if (!Number.isFinite(amountValue) || amount <= 0) {
    throw new ApiError(400, "Funding amount must be greater than zero.");
  }

  const transaction = await initializeTransaction({
    email: req.user.email,
    amount: amount * 100,
    metadata: {
      type: "wallet_funding",
      shopperId: req.user.id,
      amount,
      currency: "NGN",
    },
  });

  res.json({
    success: true,
    message: "Wallet funding started. Continue with Paystack.",
    payment: transaction,
  });
});

export const getMyWalletFundingAccount = asyncHandler(async (req, res) => {
  await ensureShopperWalletAccess(req.user.id);

  const fundingAccount = await getWalletFundingAccount(req.user.id);

  res.json({
    success: true,
    fundingAccount,
  });
});

export const provisionMyWalletFundingAccount = asyncHandler(async (req, res) => {
  await ensureShopperWalletAccess(req.user.id);

  const fundingAccount = await provisionWalletFundingAccount(req.user.id);

  res.json({
    success: true,
    message: "Personal wallet funding account is ready.",
    fundingAccount,
  });
});
