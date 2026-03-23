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

export const transitionOrderToCompleted = async (order) => {
  if (order.status === ORDER_STATUS.COMPLETED && order.isConfirmed) {
    return order;
  }

  const vendorProfile = await Vendor.findOne({ user: order.vendor });
  order.status = ORDER_STATUS.COMPLETED;
  order.isConfirmed = true;
  order.confirmedAt = new Date();
  order.completedAt = new Date();
  order.paymentReleased = false;

  if (!vendorProfile?.payoutAccount?.recipientCode) {
    order.vendorTransferStatus = "awaiting_payout_setup";
    await order.save();

    await createNotification({
      recipient: order.vendor,
      type: "delivery_confirmed",
      title: "Delivery confirmed by shopper",
      message: "A shopper confirmed delivery. Add or update payout details so escrow can be released.",
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
      title: "Escrow released",
      message: "Payment for your completed order has been released.",
      metadata: { orderId: order.id },
    });
  } catch (_error) {
    order.vendorTransferStatus = "release_pending";
    await order.save();

    await createNotification({
      recipient: order.vendor,
      type: "delivery_confirmed",
      title: "Delivery confirmed by shopper",
      message: "A shopper confirmed delivery. Escrow release is pending and needs follow-up.",
      metadata: { orderId: order.id },
    });
  }

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
