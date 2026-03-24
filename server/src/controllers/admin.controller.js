import { ORDER_STATUS } from "../constants/order.js";
import { VENDOR_SELLING_STATUS } from "../constants/vendor.js";
import { Order } from "../models/order.model.js";
import { Product } from "../models/product.model.js";
import { User } from "../models/user.model.js";
import { Vendor } from "../models/vendor.model.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";

import { createNotification } from "../services/notification.service.js";
import { releaseVendorPayoutForOrder } from "../services/order.service.js";
import { syncVendorSellingAccess } from "../services/vendor-access.service.js";

const formatSuspensionEnd = (value) =>
  value instanceof Date && !Number.isNaN(value.getTime())
    ? value.toLocaleString("en-NG", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "";

const getAdminVendorById = async (vendorId) => {
  const vendor = await Vendor.findById(vendorId).populate("user", "name email role");

  if (!vendor) {
    throw new ApiError(404, "Vendor application not found.");
  }

  await syncVendorSellingAccess(vendor);
  return vendor;
};

const attachVendorProfilesToOrders = async (orders) => {
  const orderList = Array.isArray(orders) ? orders : [orders];
  const vendorUserIds = [
    ...new Set(
      orderList
        .map((order) => order?.vendor?._id?.toString?.() || order?.vendor?.toString?.())
        .filter(Boolean),
    ),
  ];

  if (!vendorUserIds.length) {
    return Array.isArray(orders) ? orderList : orderList[0];
  }

  const vendorProfiles = await Vendor.find({ user: { $in: vendorUserIds } }).select(
    "user name payoutAccount.setupComplete sellingStatus suspensionEndsAt sellingRestrictionReason",
  );

  await Promise.all(vendorProfiles.map((vendorProfile) => syncVendorSellingAccess(vendorProfile)));

  const vendorProfileMap = new Map(
    vendorProfiles.map((vendorProfile) => [vendorProfile.user.toString(), vendorProfile.toObject()]),
  );

  const enrichedOrders = orderList.map((order) => {
    const plainOrder = typeof order.toObject === "function" ? order.toObject() : order;
    const vendorUserId =
      plainOrder?.vendor?._id?.toString?.() || plainOrder?.vendor?.toString?.() || "";

    return {
      ...plainOrder,
      vendorProfile: vendorProfileMap.get(vendorUserId) || null,
    };
  });

  return Array.isArray(orders) ? enrichedOrders : enrichedOrders[0];
};

export const adminDashboard = asyncHandler(async (_req, res) => {
  const now = new Date();
  const [users, vendors, pendingVendors, products, orders, payoutRequests, restrictedVendors] =
    await Promise.all([
      User.countDocuments(),
      Vendor.countDocuments(),
      Vendor.countDocuments({ verified: false, paymentStatus: "paid" }),
      Product.countDocuments(),
      Order.countDocuments(),
      Order.countDocuments({
        payoutRequestedAt: { $exists: true, $ne: null },
        paymentReleased: false,
        isPaid: true,
      }),
      Vendor.countDocuments({
        $or: [
          { sellingStatus: VENDOR_SELLING_STATUS.BANNED },
          {
            sellingStatus: VENDOR_SELLING_STATUS.SUSPENDED,
            suspensionEndsAt: { $gt: now },
          },
        ],
      }),
    ]);

  res.json({
    success: true,
    metrics: {
      users,
      vendors,
      pendingVendors,
      products,
      orders,
      payoutRequests,
      restrictedVendors,
    },
  });
});

export const listUsers = asyncHandler(async (_req, res) => {
  const users = await User.find().select("-password").sort({ createdAt: -1 });
  res.json({ success: true, users });
});

export const listVendorsForReview = asyncHandler(async (_req, res) => {
  const vendors = await Vendor.find().sort({ createdAt: -1 }).populate("user", "name email role");
  await Promise.all(vendors.map((vendor) => syncVendorSellingAccess(vendor)));
  res.json({ success: true, vendors });
});

export const approveVendor = asyncHandler(async (req, res) => {
  const vendor = await getAdminVendorById(req.params.id);

  if (!["paid", "waived"].includes(vendor.paymentStatus)) {
    throw new ApiError(400, "Vendor must complete registration payment before approval.");
  }

  vendor.verified = true;
  await vendor.save();

  res.json({
    success: true,
    message: "Vendor approved successfully.",
    vendor,
  });
});

export const suspendVendor = asyncHandler(async (req, res) => {
  const vendor = await getAdminVendorById(req.params.id);
  const hours = Number(req.body.hours);

  if (!Number.isFinite(hours) || hours <= 0) {
    throw new ApiError(400, "Suspension hours must be greater than zero.");
  }

  const suspensionEndsAt = new Date(Date.now() + Math.round(hours * 60 * 60 * 1000));
  const reason = req.body.reason?.trim() || "";

  vendor.sellingStatus = VENDOR_SELLING_STATUS.SUSPENDED;
  vendor.suspensionEndsAt = suspensionEndsAt;
  vendor.sellingRestrictionReason = reason;
  vendor.sellingStatusUpdatedAt = new Date();
  vendor.sellingStatusUpdatedBy = req.user.id;
  await vendor.save();

  await createNotification({
    recipient: vendor.user?._id || vendor.user,
    type: "vendor_suspended",
    title: "Selling access suspended",
    message: reason
      ? `Your store has been suspended from selling until ${formatSuspensionEnd(suspensionEndsAt)}. Reason: ${reason}`
      : `Your store has been suspended from selling until ${formatSuspensionEnd(suspensionEndsAt)}.`,
    metadata: { vendorId: vendor.id, suspensionEndsAt },
  });

  res.json({
    success: true,
    message: `Vendor suspended for ${hours} hour${hours === 1 ? "" : "s"}.`,
    vendor,
  });
});

export const banVendor = asyncHandler(async (req, res) => {
  const vendor = await getAdminVendorById(req.params.id);
  const reason = req.body.reason?.trim() || "";

  vendor.sellingStatus = VENDOR_SELLING_STATUS.BANNED;
  vendor.suspensionEndsAt = undefined;
  vendor.sellingRestrictionReason = reason;
  vendor.sellingStatusUpdatedAt = new Date();
  vendor.sellingStatusUpdatedBy = req.user.id;
  await vendor.save();

  await createNotification({
    recipient: vendor.user?._id || vendor.user,
    type: "vendor_banned",
    title: "Selling access removed",
    message: reason
      ? `Your store has been banned from selling. Reason: ${reason}`
      : "Your store has been banned from selling.",
    metadata: { vendorId: vendor.id },
  });

  res.json({
    success: true,
    message: "Vendor banned from selling.",
    vendor,
  });
});

export const restoreVendorSellingAccess = asyncHandler(async (req, res) => {
  const vendor = await getAdminVendorById(req.params.id);

  vendor.sellingStatus = VENDOR_SELLING_STATUS.ACTIVE;
  vendor.suspensionEndsAt = undefined;
  vendor.sellingRestrictionReason = "";
  vendor.sellingStatusUpdatedAt = new Date();
  vendor.sellingStatusUpdatedBy = req.user.id;
  await vendor.save();

  await createNotification({
    recipient: vendor.user?._id || vendor.user,
    type: "vendor_restored",
    title: "Selling access restored",
    message: "Your store can sell on STAPS again.",
    metadata: { vendorId: vendor.id },
  });

  res.json({
    success: true,
    message: "Vendor selling access restored.",
    vendor,
  });
});

export const listPayoutRequests = asyncHandler(async (_req, res) => {
  const payoutOrders = await Order.find({
    payoutRequestedAt: { $exists: true, $ne: null },
    paymentReleased: false,
    isPaid: true,
  })
    .sort({ payoutRequestedAt: -1, createdAt: -1 })
    .populate("product", "name image images")
    .populate("user", "name email")
    .populate("vendor", "name email");

  const orders = await attachVendorProfilesToOrders(payoutOrders);

  res.json({
    success: true,
    orders,
  });
});

export const releaseRequestedPayout = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    throw new ApiError(404, "Order not found.");
  }

  if (!order.isPaid) {
    throw new ApiError(400, "This order has not been paid yet.");
  }

  if (!order.payoutRequestedAt) {
    throw new ApiError(400, "This vendor has not requested a payout yet.");
  }

  if (order.paymentReleased) {
    throw new ApiError(400, "Payout has already been released for this order.");
  }

  if (![ORDER_STATUS.SHIPPED, ORDER_STATUS.DELIVERED, ORDER_STATUS.COMPLETED].includes(order.status)) {
    throw new ApiError(400, "Only shipped, delivered, or completed orders can be paid out.");
  }

  const updatedOrder = await releaseVendorPayoutForOrder(order, { trigger: "admin_release" });

  if (updatedOrder.paymentReleased) {
    updatedOrder.payoutProcessedAt = updatedOrder.payoutProcessedAt || new Date();
    updatedOrder.payoutProcessedBy = req.user.id;
    await updatedOrder.save();
  }

  const populatedOrder = await Order.findById(order.id)
    .populate("product", "name image images")
    .populate("user", "name email")
    .populate("vendor", "name email");

  const enrichedOrder = await attachVendorProfilesToOrders(populatedOrder);
  const message = enrichedOrder.paymentReleased
    ? "Payout released successfully."
    : enrichedOrder.vendorTransferStatus === "awaiting_payout_setup"
      ? "Vendor must finish payout setup before funds can be released."
      : "Payout release is pending follow-up.";

  res.json({
    success: true,
    message,
    order: enrichedOrder,
  });
});

export const listProductsAdmin = asyncHandler(async (_req, res) => {
  const products = await Product.find().populate("vendor", "name email");
  res.json({ success: true, products });
});

export const listOrdersAdmin = asyncHandler(async (_req, res) => {
  const orders = await Order.find()
    .sort({ createdAt: -1 })
    .populate("product", "name")
    .populate("user", "name email")
    .populate("vendor", "name email");
  const enrichedOrders = await attachVendorProfilesToOrders(orders);
  res.json({ success: true, orders: enrichedOrders });
});
