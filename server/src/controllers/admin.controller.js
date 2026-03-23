import { Order } from "../models/order.model.js";
import { Product } from "../models/product.model.js";
import { User } from "../models/user.model.js";
import { Vendor } from "../models/vendor.model.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";

export const adminDashboard = asyncHandler(async (_req, res) => {
  const [users, vendors, pendingVendors, products, orders] = await Promise.all([
    User.countDocuments(),
    Vendor.countDocuments(),
    Vendor.countDocuments({ verified: false, paymentStatus: "paid" }),
    Product.countDocuments(),
    Order.countDocuments(),
  ]);

  res.json({
    success: true,
    metrics: {
      users,
      vendors,
      pendingVendors,
      products,
      orders,
    },
  });
});

export const listUsers = asyncHandler(async (_req, res) => {
  const users = await User.find().select("-password").sort({ createdAt: -1 });
  res.json({ success: true, users });
});

export const listVendorsForReview = asyncHandler(async (_req, res) => {
  const vendors = await Vendor.find().populate("user", "name email role");
  res.json({ success: true, vendors });
});

export const approveVendor = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findById(req.params.id).populate("user");
  if (!vendor) {
    throw new ApiError(404, "Vendor application not found.");
  }

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
  res.json({ success: true, orders });
});
