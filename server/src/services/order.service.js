import { env } from "../config/env.js";
import { ORDER_STATUS } from "../constants/order.js";
import { Order } from "../models/order.model.js";
import { Vendor } from "../models/vendor.model.js";
import { ApiError } from "../utils/api-error.js";

import { createNotification } from "./notification.service.js";
import { releaseEscrowToVendor } from "./paystack.service.js";

export const computeCancelableUntil = (createdAt = new Date()) =>
  new Date(createdAt.getTime() + env.cancelWindowMinutes * 60 * 1000);

export const assertCancelable = (order) => {
  if (Date.now() > new Date(order.cancelableUntil).getTime()) {
    throw new ApiError(400, "This order can no longer be canceled after 1 hour 30 minutes.");
  }
};

export const releaseVendorPayoutForOrder = async (
  order,
  { trigger = "delivery_confirmation" } = {},
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
      title: trigger === "vendor_request" ? "Payout setup required" : "Delivery confirmed by shopper",
      message:
        trigger === "vendor_request"
          ? "You requested a payout, but your payout account is not ready yet. Add or update payout details to receive funds."
          : "A shopper confirmed delivery. Add or update payout details so escrow can be released.",
      metadata: { orderId: order.id },
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

    await createNotification({
      recipient: order.vendor,
      type: "payment_released",
      title: "Payout released",
      message:
        trigger === "vendor_request"
          ? "Your payout request was approved and funds have been released."
          : "Payment for your completed order has been released.",
      metadata: { orderId: order.id },
    });
  } catch (_error) {
    order.vendorTransferStatus = "release_pending";
    await order.save();

    await createNotification({
      recipient: order.vendor,
      type: "delivery_confirmed",
      title: trigger === "vendor_request" ? "Payout request pending" : "Delivery confirmed by shopper",
      message:
        trigger === "vendor_request"
          ? "Your payout request is pending and needs follow-up."
          : "A shopper confirmed delivery. Escrow release is pending and needs follow-up.",
      metadata: { orderId: order.id },
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
  await order.save();

  if (order.paymentReleased) {
    await createNotification({
      recipient: order.vendor,
      type: "delivery_confirmed",
      title: "Delivery confirmed by shopper",
      message: "A shopper confirmed delivery for an order that has already been paid out.",
      metadata: { orderId: order.id },
    });

    return order;
  }

  return releaseVendorPayoutForOrder(order, { trigger: "delivery_confirmation" });
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
