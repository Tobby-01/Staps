import { env } from "../config/env.js";
import { ApiError } from "../utils/api-error.js";

const paystackRequest = async (path, options = {}) => {
  if (!env.paystackSecretKey) {
    throw new ApiError(
      500,
      "Paystack secret key is not configured. Update server/.env before using payments.",
    );
  }

  const response = await fetch(`${env.paystackBaseUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${env.paystackSecretKey}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const payload = await response.json();

  if (!response.ok || payload.status === false) {
    throw new ApiError(response.status || 500, payload.message || "Paystack request failed");
  }

  return payload.data;
};

export const initializeTransaction = ({ email, amount, metadata, callbackUrl }) =>
  paystackRequest("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email,
      amount,
      callback_url: callbackUrl || env.paystackCallbackUrl,
      metadata,
    }),
  });

export const verifyTransaction = (reference) =>
  paystackRequest(`/transaction/verify/${reference}`, {
    method: "GET",
  });

export const refundTransaction = (reference, amount) =>
  paystackRequest("/refund", {
    method: "POST",
    body: JSON.stringify({
      transaction: reference,
      amount,
    }),
  });

export const listBanks = (currency = "NGN") =>
  paystackRequest(`/bank?currency=${encodeURIComponent(currency)}`, {
    method: "GET",
  });

export const resolveAccountNumber = ({ accountNumber, bankCode }) =>
  paystackRequest(
    `/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`,
    {
      method: "GET",
    },
  );

export const createTransferRecipient = ({ name, accountNumber, bankCode, currency = "NGN" }) =>
  paystackRequest("/transferrecipient", {
    method: "POST",
    body: JSON.stringify({
      type: "nuban",
      name,
      account_number: accountNumber,
      bank_code: bankCode,
      currency,
    }),
  });

export const initiateTransfer = ({ amount, recipient, reference, reason, currency = "NGN" }) =>
  paystackRequest("/transfer", {
    method: "POST",
    body: JSON.stringify({
      source: "balance",
      amount,
      recipient,
      reference,
      reason,
      currency,
    }),
  });

export const listCustomersByEmail = (email) =>
  paystackRequest(`/customer?perPage=50&email=${encodeURIComponent(email)}`, {
    method: "GET",
  });

export const createCustomer = ({ email, firstName, lastName, phone }) =>
  paystackRequest("/customer", {
    method: "POST",
    body: JSON.stringify({
      email,
      first_name: firstName,
      last_name: lastName,
      phone,
    }),
  });

export const createDedicatedAccount = ({ customerCode, preferredBank = "wema-bank" }) =>
  paystackRequest("/dedicated_account", {
    method: "POST",
    body: JSON.stringify({
      customer: customerCode,
      preferred_bank: preferredBank,
    }),
  });

export const releaseEscrowToVendor = async (order, recipientCode) => {
  if (!recipientCode) {
    throw new ApiError(
      400,
      "Vendor payout profile is not configured yet. Add bank details before releasing payouts.",
    );
  }

  const reference = `staps-payout-${order.id}-${Date.now()}`.toLowerCase();
  const transfer = await initiateTransfer({
    amount: Math.round(Number(order.totalAmount) * 100),
    recipient: recipientCode,
    reference,
    reason: `STAPS payout for order ${order.id}`,
  });

  if (transfer.status === "otp") {
    throw new ApiError(
      500,
      "Paystack transfer requires OTP approval. Disable transfer OTP for automated payouts.",
    );
  }

  return {
    status: transfer.status,
    message: transfer.status === "pending" ? "Transfer queued successfully." : "Transfer created.",
    orderId: order.id,
    reference,
    transferCode: transfer.transfer_code,
    transferId: transfer.id,
  };
};
