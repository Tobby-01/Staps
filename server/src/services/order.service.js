import { env } from "../config/env.js";
import { ORDER_STATUS } from "../constants/order.js";
import { Order } from "../models/order.model.js";
import { Vendor } from "../models/vendor.model.js";
import { ApiError } from "../utils/api-error.js";

import { createNotification } from "./notification.service.js";
import { releaseEscrowToVendor } from "./paystack.service.js";

const formatOrderNumber = (orderId = "") => `#${String(orderId).slice(-6).toUpperCase()}`;

const getPayoutReleaseCopy = (trigger) => {
  if (trigger === "admin_release") {
    return {
      title: "Payout released by admin",
      message: "Your payout request was approved and funds have been released.",
    };
  }

  if (trigger === "vendor_request") {
    return {
      title: "Payout request received",
      message: "Your payout request is saved and awaiting admin review.",
    };
  }

  return {
    title: "Delivery confirmed by shopper",
    message: "A shopper confirmed delivery. Request payout when you are ready for admin review.",
  };
};

export const computeCancelableUntil = (createdAt = new Date()) =>
  new Date(createdAt.getTime() + env.cancelWindowMinutes * 60 * 1000);

export const assertCancelable = (order) => {
  if (Date.now() > new Date(order.cancelableUntil).getTime()) {
    throw new ApiError(400, "This order can no longer be canceled after 1 hour 30 minutes.");
  }
};

export const releaseVendorPayoutForOrder = async (
  order,
  { trigger = "admin_release" } = {},
) => {
  if (order.paymentReleased) {
    return order;
  }

  const vendorProfile = await Vendor.findOne({ user: order.vendor });

  if (!vendorProfile?.payoutAccount?.recipientCode) {
    order.vendorTransferStatus = "awaiting_payout_setup";
    await order.save();

    await createNotification({
      recipient: order.vendor,
      type: "delivery_confirmed",
      title: trigger === "admin_release" ? "Payout setup required" : "Delivery confirmed by shopper",
      message:
        trigger === "admin_release"
          ? "An admin tried to release your payout, but your payout account is not ready yet. Add or update payout details to receive funds."
          : "A shopper confirmed delivery. Add or update payout details so escrow can be released.",
      metadata: { orderId: order.id, orderNumber: formatOrderNumber(order.id) },
    });

    return order;
  }

  try {
    const payout = await releaseEscrowToVendor(order, vendorProfile.payoutAccount.recipientCode);
    order.paymentReleased = true;
    order.vendorTransferReference = payout.reference;
    order.vendorTransferCode = payout.transferCode;
    order.vendorTransferStatus = payout.status;
    order.vendorTransferQueuedAt = new Date();
    await order.save();

    const payoutReleaseCopy = getPayoutReleaseCopy(trigger);
    await createNotification({
      recipient: order.vendor,
      type: "payment_released",
      title: payoutReleaseCopy.title,
      message: payoutReleaseCopy.message,
      metadata: { orderId: order.id, orderNumber: formatOrderNumber(order.id) },
    });
  } catch (_error) {
    order.vendorTransferStatus = "release_pending";
    await order.save();

    await createNotification({
      recipient: order.vendor,
      type: "delivery_confirmed",
      title: trigger === "admin_release" ? "Payout release pending" : "Delivery confirmed by shopper",
      message:
        trigger === "admin_release"
          ? "Your payout request is still pending and needs follow-up."
          : "A shopper confirmed delivery. Escrow release is pending and needs follow-up.",
      metadata: { orderId: order.id, orderNumber: formatOrderNumber(order.id) },
    });
  }

  return order;
};

export const transitionOrderToCompleted = async (order) => {
  if (order.status === ORDER_STATUS.COMPLETED && order.isConfirmed) {
    return order;
  }

  order.status = ORDER_STATUS.COMPLETED;
  order.isConfirmed = true;
  order.confirmedAt = new Date();
  order.completedAt = new Date();
  if (!order.paymentReleased) {
    order.vendorTransferStatus = order.payoutRequestedAt
      ? "payout_requested"
      : order.vendorTransferStatus || "awaiting_payout_request";
  }
  await order.save();

  await createNotification({
    recipient: order.vendor,
    type: "delivery_confirmed",
    title: "Delivery confirmed by shopper",
    message: order.paymentReleased
      ? "A shopper confirmed delivery for an order that has already been paid out."
      : order.payoutRequestedAt
        ? "A shopper confirmed delivery. Your payout request is now awaiting admin release."
        : "A shopper confirmed delivery. Request payout when you are ready for admin review.",
    metadata: { orderId: order.id, orderNumber: formatOrderNumber(order.id) },
  });

  return order;
};

export const runAutoConfirmSweep = async () => {
  const threshold = new Date(Date.now() - env.autoConfirmHours * 60 * 60 * 1000);
  const orders = await Order.find({
    status: ORDER_STATUS.DELIVERED,
    paymentReleased: false,
    deliveredAt: { $lte: threshold },
  });

  const settled = [];
  for (const order of orders) {
    settled.push(await transitionOrderToCompleted(order));
  }

  return settled;
};
