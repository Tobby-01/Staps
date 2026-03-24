import { ORDER_STATUS } from "../constants/order.js";
import { Order } from "../models/order.model.js";
import { Vendor } from "../models/vendor.model.js";
import { ApiError } from "../utils/api-error.js";

import { sendVendorNewOrderEmail } from "./mail.service.js";
import { createNotification } from "./notification.service.js";
import { verifyTransaction } from "./paystack.service.js";

const formatOrderNumber = (orderId = "") => `#${String(orderId).slice(-6).toUpperCase()}`;

const getMetadataOrderIds = (metadata = {}) =>
  [
    metadata.orderId,
    ...(Array.isArray(metadata.orderIds) ? metadata.orderIds : []),
  ]
    .filter(Boolean)
    .map(String);

const resolveOrdersForPayment = async ({ payment, reference }) => {
  const ordersByReference = await Order.find({ paystackReference: reference });
  if (ordersByReference.length) {
    return ordersByReference;
  }

  const metadataOrderIds = [...new Set(getMetadataOrderIds(payment.metadata))];
  if (!metadataOrderIds.length) {
    return [];
  }

  return Order.find({ _id: { $in: metadataOrderIds } });
};

const finalizeOrderPayment = async ({ payment, reference }) => {
  const orders = await resolveOrdersForPayment({ payment, reference });

  if (!orders.length) {
    throw new ApiError(404, "Order not found for this payment reference.");
  }

  if (orders.every((order) => order.isPaid)) {
    return {
      intent: "order_payment",
      message: "Payment already verified.",
      order: orders[0],
      orders,
      payment,
    };
  }

  if (payment.status !== "success") {
    throw new ApiError(400, "Payment is not successful yet.");
  }

  const updatedOrders = [];

  for (const order of orders) {
    if (!order.isPaid) {
      order.isPaid = true;
      order.status = ORDER_STATUS.PAID;
      order.paidAt = order.paidAt || new Date();
      order.paystackReference = reference;
      order.paymentChannel = payment.channel || order.paymentChannel;
      await order.save();

      await createNotification({
        recipient: order.vendor,
        type: "payment_confirmed",
        title: "Payment confirmed",
        message: "A shopper has paid for a new order.",
        metadata: { orderId: order.id, orderNumber: formatOrderNumber(order.id) },
      });

      try {
        const populatedOrder = await Order.findById(order.id)
          .populate("product", "name image images")
          .populate("user", "name email")
          .populate("vendor", "name email");

        if (populatedOrder?.vendor?.email) {
          await sendVendorNewOrderEmail({
            to: populatedOrder.vendor.email,
            vendorName: populatedOrder.vendor.name,
            shopperName: populatedOrder.user?.name || "A shopper",
            productName: populatedOrder.product?.name || "New order",
            productImage:
              populatedOrder.product?.image || populatedOrder.product?.images?.[0] || "",
            amountPaid: populatedOrder.totalAmount,
            quantity: populatedOrder.quantity,
            deliveryDetails: populatedOrder.deliveryDetails,
            orderId: populatedOrder.id,
          });
        }
      } catch (error) {
        console.error("Failed to send vendor order email");
        console.error(error);
      }
    }

    updatedOrders.push(order);
  }

  return {
    intent: "order_payment",
    message:
      updatedOrders.length > 1
        ? "Payment verified successfully. Your orders are now in the vendor queues."
        : "Payment verified successfully. Your order is now in the vendor queue.",
    order: updatedOrders[0],
    orders: updatedOrders,
    payment,
  };
};

const finalizeVendorRegistrationPayment = async ({ payment, reference }) => {
  const vendor =
    (await Vendor.findOne({ registrationReference: reference })) ||
    (payment.metadata?.userId ? await Vendor.findOne({ user: payment.metadata.userId }) : null);

  if (!vendor) {
    throw new ApiError(404, "Vendor application not found for this payment reference.");
  }

  if (vendor.paymentStatus === "paid") {
    return {
      intent: "vendor_registration",
      message: "Vendor registration payment already verified.",
      vendor,
      payment,
    };
  }

  if (payment.status !== "success") {
    throw new ApiError(400, "Vendor payment has not been completed.");
  }

  vendor.paymentStatus = "paid";
  vendor.registrationReference = reference;
  vendor.registrationPaidAt = vendor.registrationPaidAt || new Date();
  await vendor.save();

  await createNotification({
    recipient: vendor.user,
    type: "vendor_payment_confirmed",
    title: "Vendor payment confirmed",
    message: "Your registration fee has been confirmed. Await admin approval.",
    metadata: { vendorId: vendor.id },
  });

  return {
    intent: "vendor_registration",
    message: "Vendor registration payment verified. Await admin approval.",
    vendor,
    payment,
  };
};

export const finalizePaystackPayment = async (reference) => {
  const payment = await verifyTransaction(reference);
  const paymentType = payment.metadata?.type;

  if (paymentType === "order_payment") {
    return finalizeOrderPayment({ payment, reference });
  }

  if (paymentType === "vendor_registration") {
    return finalizeVendorRegistrationPayment({ payment, reference });
  }

  const order = await Order.findOne({ paystackReference: reference }).select("_id");
  if (order) {
    return finalizeOrderPayment({ payment, reference });
  }

  const vendor = await Vendor.findOne({ registrationReference: reference }).select("_id");
  if (vendor) {
    return finalizeVendorRegistrationPayment({ payment, reference });
  }

  throw new ApiError(404, "No STAPS payment record was found for this reference.");
};
