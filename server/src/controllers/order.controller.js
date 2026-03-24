import { ORDER_STATUS } from "../constants/order.js";
import { DEFAULT_DELIVERY_FEE } from "../constants/marketplace.js";
import { ROLES } from "../constants/roles.js";
import { Order } from "../models/order.model.js";
import { Product } from "../models/product.model.js";
import { Vendor } from "../models/vendor.model.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";

import { sendShopperOrderStatusEmail } from "../services/mail.service.js";
import { createNotification } from "../services/notification.service.js";
import {
  assertCancelable,
  computeCancelableUntil,
  releaseVendorPayoutForOrder,
  runAutoConfirmSweep,
  transitionOrderToCompleted,
} from "../services/order.service.js";
import {
  initializeTransaction,
  refundTransaction,
} from "../services/paystack.service.js";
import { finalizePaystackPayment } from "../services/payment.service.js";

const formatOrderNumber = (orderId = "") => `#${String(orderId).slice(-6).toUpperCase()}`;

const normalizeCheckoutItems = (payload = {}) => {
  const requestedItems = Array.isArray(payload.items) && payload.items.length
    ? payload.items
    : payload.productId
      ? [{ productId: payload.productId, quantity: payload.quantity }]
      : [];

  return requestedItems.map((item) => {
    const productId = String(item?.productId || item?.id || "").trim();
    const quantityValue = Number(item?.quantity);
    const quantity =
      Number.isFinite(quantityValue) && quantityValue > 0 ? Math.round(quantityValue) : 1;

    if (!productId) {
      throw new ApiError(400, "Each checkout item must include a product.");
    }

    return { productId, quantity };
  });
};

const normalizeDeliveryDetails = (deliveryDetails = {}) => {
  const recipientName = deliveryDetails.recipientName?.trim();
  const phone = deliveryDetails.phone?.trim();
  const location = deliveryDetails.location?.trim();
  const address = deliveryDetails.address?.trim();
  const notes = deliveryDetails.notes?.trim();

  if (!recipientName || !phone || !location || !address) {
    throw new ApiError(
      400,
      "Recipient name, phone, delivery location, and address are required.",
    );
  }

  return {
    recipientName,
    phone,
    location,
    address,
    ...(notes ? { notes } : {}),
  };
};

const getCheckoutUnitPrice = (product) =>
  product.isFlashSale && product.discountPrice && product.flashSaleEndTime > new Date()
    ? product.discountPrice
    : product.price;

const getProductDeliveryFee = (product) => {
  const deliveryFee = Number(product?.deliveryFee);
  return Number.isFinite(deliveryFee) ? Math.round(deliveryFee) : DEFAULT_DELIVERY_FEE;
};

export const initializeOrderPayment = asyncHandler(async (req, res) => {
  const checkoutItems = normalizeCheckoutItems(req.body);
  if (!checkoutItems.length) {
    throw new ApiError(400, "Select at least one product to checkout.");
  }

  const deliveryDetails = normalizeDeliveryDetails(req.body.deliveryDetails);
  const uniqueProductIds = [...new Set(checkoutItems.map((item) => item.productId))];
  const products = await Product.find({
    _id: { $in: uniqueProductIds },
    isActive: true,
  });

  if (products.length !== uniqueProductIds.length) {
    throw new ApiError(404, "One or more selected products are no longer available.");
  }

  const productMap = new Map(products.map((product) => [product.id, product]));
  const vendorIds = [...new Set(products.map((product) => product.vendor.toString()))];
  const verifiedVendors = await Vendor.find({
    user: { $in: vendorIds },
    verified: true,
  }).select("user");

  if (verifiedVendors.length !== vendorIds.length) {
    throw new ApiError(400, "One or more vendors are not verified to receive orders.");
  }

  const ordersPayload = checkoutItems.map((item) => {
    const product = productMap.get(item.productId);
    if (!product) {
      throw new ApiError(404, "One or more selected products are no longer available.");
    }

    const unitPrice = getCheckoutUnitPrice(product);
    const deliveryFee = getProductDeliveryFee(product);
    const totalAmount = unitPrice * item.quantity + deliveryFee;

    return {
      user: req.user.id,
      vendor: product.vendor,
      product: product.id,
      quantity: item.quantity,
      totalAmount,
      deliveryFee,
      deliveryDetails,
      cancelableUntil: computeCancelableUntil(),
    };
  });

  let orders = await Order.create(ordersPayload);
  let transaction;

  try {
    transaction = await initializeTransaction({
      email: req.user.email,
      amount: Math.round(orders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0) * 100),
      metadata: {
        type: "order_payment",
        orderId: orders[0]?.id,
        orderIds: orders.map((order) => order.id),
        productIds: orders.map((order) => order.product.toString()),
        shopperId: req.user.id,
        vendorIds,
        deliveryLocation: deliveryDetails.location,
        itemCount: orders.length,
      },
    });

    await Order.updateMany(
      { _id: { $in: orders.map((order) => order._id) } },
      { $set: { paystackReference: transaction.reference } },
    );

    orders = orders.map((order) => {
      order.paystackReference = transaction.reference;
      return order;
    });
  } catch (error) {
    await Order.deleteMany({
      _id: { $in: orders.map((order) => order._id) },
      isPaid: false,
    });

    throw error;
  }

  res.status(201).json({
    success: true,
    message:
      orders.length > 1
        ? "Orders created. Continue with payment to confirm all selected items."
        : "Order created. Continue with payment.",
    order: orders[0],
    orders,
    payment: transaction,
  });
});

export const verifyOrderPayment = asyncHandler(async (req, res) => {
  const { reference } = req.params;
  const orders = await Order.find({ paystackReference: reference });

  if (!orders.length) {
    throw new ApiError(404, "Order not found for this payment reference.");
  }

  const belongsToCurrentUser = orders.every((order) => String(order.user) === req.user.id);
  if (!belongsToCurrentUser && req.user.role !== ROLES.ADMIN) {
    throw new ApiError(403, "You cannot verify this payment.");
  }

  if (orders.every((order) => order.isPaid)) {
    return res.json({
      success: true,
      message: "Payment already verified.",
      order: orders[0],
      orders,
    });
  }

  const result = await finalizePaystackPayment(reference);
  if (result.intent !== "order_payment") {
    throw new ApiError(400, "This payment reference does not belong to an order.");
  }

  res.json({
    success: true,
    message: result.message,
    order: result.order,
    orders: result.orders,
  });
});

export const listMyOrders = asyncHandler(async (req, res) => {
  const filter =
    req.user.role === ROLES.VENDOR ? { vendor: req.user.id } : { user: req.user.id };

  const pendingReferences = await Order.distinct("paystackReference", {
    ...filter,
    status: ORDER_STATUS.PENDING,
    isPaid: false,
    paystackReference: { $exists: true, $ne: null },
  });

  for (const reference of pendingReferences.filter(Boolean)) {
    try {
      await finalizePaystackPayment(reference);
    } catch (_error) {
      // Keep the order pending if payment is not yet successful or verification fails.
    }
  }

  const orders = await Order.find(filter)
    .sort({ createdAt: -1 })
    .populate("product", "name image images price deliveryFee")
    .populate("user", "name email")
    .populate("vendor", "name email");

  res.json({
    success: true,
    orders,
  });
});

export const vendorAcceptOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, vendor: req.user.id });
  if (!order) {
    throw new ApiError(404, "Order not found.");
  }

  if (!order.isPaid) {
    throw new ApiError(400, "Order must be paid before processing.");
  }

  if (order.status !== ORDER_STATUS.PAID) {
    throw new ApiError(400, "Only paid orders can be accepted.");
  }

  order.status = ORDER_STATUS.PROCESSING;
  order.vendorTransferStatus = "payment_secured";
  await order.save();

  await createNotification({
    recipient: order.user,
    type: "order_processing",
    title: "Order accepted",
    message: "Your order has been accepted and is being processed.",
    metadata: { orderId: order.id, orderNumber: formatOrderNumber(order.id) },
  });

  try {
    const populatedOrder = await Order.findById(order.id)
      .populate("product", "name image images")
      .populate("user", "name email");

    if (populatedOrder?.user?.email) {
      await sendShopperOrderStatusEmail({
        to: populatedOrder.user.email,
        shopperName: populatedOrder.user.name,
        productName: populatedOrder.product?.name || "Your order",
        productImage:
          populatedOrder.product?.image || populatedOrder.product?.images?.[0] || "",
        orderId: populatedOrder.id,
        status: "processing",
      });
    }
  } catch (error) {
    console.error("Failed to send shopper processing email");
    console.error(error);
  }

  res.json({
    success: true,
    order,
  });
});

export const vendorShipOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, vendor: req.user.id });
  if (!order) {
    throw new ApiError(404, "Order not found.");
  }

  if (order.status !== ORDER_STATUS.PROCESSING) {
    throw new ApiError(400, "Only processing orders can be marked as shipped.");
  }

  order.status = ORDER_STATUS.SHIPPED;
  order.shippedAt = new Date();
  if (!order.paymentReleased) {
    order.vendorTransferStatus = "awaiting_payout_request";
  }
  await order.save();

  await createNotification({
    recipient: order.user,
    type: "order_shipped",
    title: "Order shipped",
    message: "Your order is on the way.",
    metadata: { orderId: order.id, orderNumber: formatOrderNumber(order.id) },
  });

  try {
    const populatedOrder = await Order.findById(order.id)
      .populate("product", "name image images")
      .populate("user", "name email");

    const startDate = new Date(order.shippedAt);
    startDate.setDate(startDate.getDate() + 1);
    const endDate = new Date(order.shippedAt);
    endDate.setDate(endDate.getDate() + 3);
    const estimatedDeliveryWindow = `${startDate.toLocaleDateString()} and ${endDate.toLocaleDateString()}`;

    if (populatedOrder?.user?.email) {
      await sendShopperOrderStatusEmail({
        to: populatedOrder.user.email,
        shopperName: populatedOrder.user.name,
        productName: populatedOrder.product?.name || "Your order",
        productImage:
          populatedOrder.product?.image || populatedOrder.product?.images?.[0] || "",
        orderId: populatedOrder.id,
        status: "shipped",
        estimatedDeliveryWindow,
      });
    }
  } catch (error) {
    console.error("Failed to send shopper shipped email");
    console.error(error);
  }

  res.json({
    success: true,
    order,
  });
});

export const vendorDeliverOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, vendor: req.user.id });
  if (!order) {
    throw new ApiError(404, "Order not found.");
  }

  if (order.status !== ORDER_STATUS.SHIPPED) {
    throw new ApiError(400, "Only shipped orders can be marked as delivered.");
  }

  order.status = ORDER_STATUS.DELIVERED;
  order.deliveredAt = new Date();
  await order.save();

  await createNotification({
    recipient: order.user,
    type: "order_delivered",
    title: "Order delivered",
    message: "Your order has been marked as delivered. Confirm to release payment.",
    metadata: { orderId: order.id, orderNumber: formatOrderNumber(order.id) },
  });

  try {
    const populatedOrder = await Order.findById(order.id)
      .populate("product", "name image images")
      .populate("user", "name email");

    if (populatedOrder?.user?.email) {
      await sendShopperOrderStatusEmail({
        to: populatedOrder.user.email,
        shopperName: populatedOrder.user.name,
        productName: populatedOrder.product?.name || "Your order",
        productImage:
          populatedOrder.product?.image || populatedOrder.product?.images?.[0] || "",
        orderId: populatedOrder.id,
        status: "delivered",
      });
    }
  } catch (error) {
    console.error("Failed to send shopper delivered email");
    console.error(error);
  }

  res.json({
    success: true,
    order,
  });
});

export const confirmDelivery = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user.id });
  if (!order) {
    throw new ApiError(404, "Order not found.");
  }

  if (order.status !== ORDER_STATUS.DELIVERED) {
    throw new ApiError(400, "Only delivered orders can be confirmed.");
  }

  const updatedOrder = await transitionOrderToCompleted(order);
  const message = updatedOrder.paymentReleased
    ? "Delivery confirmed and vendor payout released."
    : "Delivery confirmed successfully.";

  res.json({
    success: true,
    message,
    order: updatedOrder,
  });
});

export const vendorRequestPayout = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, vendor: req.user.id });
  if (!order) {
    throw new ApiError(404, "Order not found.");
  }

  if (!order.isPaid) {
    throw new ApiError(400, "This order has not been paid yet.");
  }

  if (order.status !== ORDER_STATUS.SHIPPED) {
    throw new ApiError(400, "You can only request payout after the order has been marked as shipped.");
  }

  if (order.paymentReleased) {
    return res.json({
      success: true,
      message: "Payout has already been released for this order.",
      order,
    });
  }

  order.payoutRequestedAt = new Date();
  order.vendorTransferStatus = "payout_requested";
  await order.save();

  const updatedOrder = await releaseVendorPayoutForOrder(order, { trigger: "vendor_request" });
  const message = updatedOrder.paymentReleased
    ? "Payout requested successfully and funds have been released."
    : updatedOrder.vendorTransferStatus === "awaiting_payout_setup"
      ? "Payout request saved. Add your payout details to receive funds."
      : "Payout request saved and is pending processing.";

  res.json({
    success: true,
    message,
    order: updatedOrder,
  });
});

export const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user.id });
  if (!order) {
    throw new ApiError(404, "Order not found.");
  }

  if ([ORDER_STATUS.COMPLETED, ORDER_STATUS.CANCELED].includes(order.status)) {
    throw new ApiError(400, "This order can no longer be canceled.");
  }

  assertCancelable(order);

  if (order.isPaid && order.paystackReference) {
    await refundTransaction(order.paystackReference, order.totalAmount * 100);
  }

  order.status = ORDER_STATUS.CANCELED;
  order.canceledAt = new Date();
  await order.save();

  await createNotification({
    recipient: order.vendor,
    type: "order_canceled",
    title: "Order canceled",
    message: "A shopper canceled an order within the allowed refund window.",
    metadata: { orderId: order.id, orderNumber: formatOrderNumber(order.id) },
  });

  res.json({
    success: true,
    message: "Order canceled successfully.",
    order,
  });
});

export const autoConfirmDeliveredOrders = asyncHandler(async (_req, res) => {
  const settledOrders = await runAutoConfirmSweep();

  res.json({
    success: true,
    message: "Auto-confirm sweep completed.",
    count: settledOrders.length,
  });
});
