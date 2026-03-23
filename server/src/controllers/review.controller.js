import { ORDER_STATUS } from "../constants/order.js";
import { Order } from "../models/order.model.js";
import { Product } from "../models/product.model.js";
import { Review } from "../models/review.model.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";

export const createReview = asyncHandler(async (req, res) => {
  const { productId, rating, comment } = req.body;

  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(404, "Product not found.");
  }

  const completedOrder = await Order.findOne({
    user: req.user.id,
    product: productId,
    status: ORDER_STATUS.COMPLETED,
  });

  if (!completedOrder) {
    throw new ApiError(403, "Only completed orders can be reviewed.");
  }

  const review = await Review.create({
    user: req.user.id,
    vendor: product.vendor,
    product: product.id,
    rating: Number(rating),
    comment,
    imageUrl: req.file ? `/uploads/products/${req.file.filename}` : undefined,
  });

  res.status(201).json({
    success: true,
    review,
  });
});

export const listReviews = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.query.productId) {
    filter.product = req.query.productId;
  }

  if (req.query.vendorId) {
    filter.vendor = req.query.vendorId;
  }

  if (req.query.userId) {
    filter.user = req.query.userId;
  }

  const reviews = await Review.find(filter)
    .sort({ createdAt: -1 })
    .populate("user", "name")
    .populate("product", "name")
    .populate("vendor", "name username");

  res.json({
    success: true,
    reviews,
  });
});
