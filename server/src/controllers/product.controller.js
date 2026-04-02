import { Follow } from "../models/follow.model.js";
import { Order } from "../models/order.model.js";
import { Product } from "../models/product.model.js";
import { ORDER_STATUS } from "../constants/order.js";
import {
  DEFAULT_DELIVERY_FEE,
  MAX_DELIVERY_FEE,
  MIN_DELIVERY_FEE,
} from "../constants/marketplace.js";
import { VENDOR_SELLING_STATUS } from "../constants/vendor.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";

import { createBulkNotifications } from "../services/notification.service.js";
import {
  hasCloudflareR2Config,
  uploadProductImagesToR2,
} from "../services/cloudflare-r2.service.js";
import {
  ensureVendorCanSell,
  listSellableVendorProfiles,
} from "../services/vendor-access.service.js";

const attachVendorMetadata = async (products) => {
  const productList = Array.isArray(products) ? products : [products];
  const vendorUserIds = [
    ...new Set(
      productList
        .map((product) => product?.vendor?._id?.toString?.() || product?.vendor?.toString?.())
        .filter(Boolean),
    ),
  ];

  if (!vendorUserIds.length) {
    return Array.isArray(products) ? productList : productList[0];
  }

  const vendorProfiles = await listSellableVendorProfiles(vendorUserIds);

  const vendorProfileMap = new Map(
    vendorProfiles.map((vendorProfile) => [vendorProfile.user.toString(), vendorProfile.toObject()]),
  );

  const enrichedProducts = productList.map((product) => {
    const vendorId = product?.vendor?._id?.toString?.() || product?.vendor?.toString?.();
    const vendorProfile = vendorId ? vendorProfileMap.get(vendorId) : null;

    if (!product?.vendor || !vendorProfile) {
      return product;
    }

    return {
      ...product,
      vendor: {
        ...product.vendor,
        name: vendorProfile.name || product.vendor.name,
        verified: vendorProfile.verified,
        sellingStatus: vendorProfile.sellingStatus,
        suspensionEndsAt: vendorProfile.suspensionEndsAt,
      },
    };
  });

  return Array.isArray(products) ? enrichedProducts : enrichedProducts[0];
};

const matchesMarketplaceSearch = (product, searchTerm) => {
  if (!searchTerm) {
    return true;
  }

  const normalizedSearch = searchTerm.trim().toLowerCase();
  if (!normalizedSearch) {
    return true;
  }

  return [
    product?.name,
    product?.description,
    product?.category,
    product?.vendor?.name,
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(normalizedSearch));
};

const isStorefrontAvailable = (product) =>
  product?.vendor?.verified && product?.vendor?.sellingStatus === VENDOR_SELLING_STATUS.ACTIVE;

const parseDeliveryFeeInput = (value, { fallback = DEFAULT_DELIVERY_FEE } = {}) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const parsedValue = Number(value);
  if (!Number.isFinite(parsedValue)) {
    throw new ApiError(400, "Delivery fee must be a valid number.");
  }

  if (parsedValue < MIN_DELIVERY_FEE || parsedValue > MAX_DELIVERY_FEE) {
    throw new ApiError(
      400,
      `Delivery fee must be between NGN ${MIN_DELIVERY_FEE} and NGN ${MAX_DELIVERY_FEE}.`,
    );
  }

  return Math.round(parsedValue);
};

const rankProductsForHomeFeed = async (products = [], { limit = 6 } = {}) => {
  if (!products.length) {
    return [];
  }

  const normalizedLimit = Math.max(1, Math.min(24, Number(limit) || 6));
  const productIds = products.map((product) => product._id || product.id).filter(Boolean);

  if (!productIds.length) {
    return products.slice(0, normalizedLimit);
  }

  const paidOrders = await Order.find({
    product: { $in: productIds },
    isPaid: true,
    status: {
      $in: [
        ORDER_STATUS.PAID,
        ORDER_STATUS.PROCESSING,
        ORDER_STATUS.SHIPPED,
        ORDER_STATUS.DELIVERED,
        ORDER_STATUS.COMPLETED,
      ],
    },
  })
    .select("product quantity createdAt")
    .lean();

  const orderScoreByProduct = new Map();

  for (const order of paidOrders) {
    const productId = String(order.product || "");
    if (!productId) {
      continue;
    }

    const existing = orderScoreByProduct.get(productId) || {
      orderCount: 0,
      lastOrderAt: 0,
    };

    existing.orderCount += Math.max(1, Math.round(Number(order.quantity || 1)));
    existing.lastOrderAt = Math.max(
      existing.lastOrderAt,
      new Date(order.createdAt || Date.now()).getTime(),
    );

    orderScoreByProduct.set(productId, existing);
  }

  const rankedProducts = [...products].sort((left, right) => {
    const leftScore = orderScoreByProduct.get(String(left._id || left.id)) || {
      orderCount: 0,
      lastOrderAt: 0,
    };
    const rightScore = orderScoreByProduct.get(String(right._id || right.id)) || {
      orderCount: 0,
      lastOrderAt: 0,
    };

    if (leftScore.orderCount !== rightScore.orderCount) {
      return rightScore.orderCount - leftScore.orderCount;
    }

    if (leftScore.lastOrderAt !== rightScore.lastOrderAt) {
      return rightScore.lastOrderAt - leftScore.lastOrderAt;
    }

    return new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime();
  });

  return rankedProducts.slice(0, normalizedLimit);
};

export const listProducts = asyncHandler(async (req, res) => {
  const query = { isActive: true };
  const searchTerm = String(req.query.search || "").trim();

  if (req.query.vendorId) {
    query.vendor = req.query.vendorId;
  }

  if (req.query.category) {
    query.category = req.query.category;
  }

  const products = await Product.find(query)
    .sort({ createdAt: -1 })
    .populate("vendor", "name email")
    .lean();

  const enrichedProducts = await attachVendorMetadata(products);
  const filteredProducts = enrichedProducts.filter((product) =>
    isStorefrontAvailable(product) && matchesMarketplaceSearch(product, searchTerm),
  );

  if (String(req.query.feed || "").trim().toLowerCase() === "home") {
    const rankedProducts = await rankProductsForHomeFeed(filteredProducts, {
      limit: req.query.limit,
    });

    return res.json({
      success: true,
      products: rankedProducts,
    });
  }

  res.json({
    success: true,
    products: filteredProducts,
  });
});

export const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).populate("vendor", "name email").lean();
  if (!product) {
    throw new ApiError(404, "Product not found.");
  }

  const enrichedProduct = await attachVendorMetadata(product);
  if (!isStorefrontAvailable(enrichedProduct)) {
    throw new ApiError(404, "Product not found.");
  }

  res.json({
    success: true,
    product: enrichedProduct,
  });
});

export const createProduct = asyncHandler(async (req, res) => {
  await ensureVendorCanSell(req.user.id);

  const { name, price, deliveryFee, description, category, isFlashSale, discountPrice, flashSaleEndTime } = req.body;
  if (!name || price === undefined || price === null || price === "" || !description || !category) {
    throw new ApiError(400, "Name, price, description, and category are required.");
  }

  let imagePaths = (req.files || []).map((file) => `/uploads/products/${file.filename}`);

  if (req.files?.length && hasCloudflareR2Config()) {
    const uploadedImages = await uploadProductImagesToR2(req.files, (_file, index) => ({
      type: "product",
      vendorId: req.user.id,
      productName: name,
      slot: index,
    }));
    imagePaths = uploadedImages.map((entry) => entry.url);
  }

  const product = await Product.create({
    vendor: req.user.id,
    name,
    price: Number(price),
    deliveryFee: parseDeliveryFeeInput(deliveryFee),
    description,
    category,
    image: imagePaths[0],
    images: imagePaths,
    isFlashSale: isFlashSale === "true" || isFlashSale === true,
    discountPrice: discountPrice ? Number(discountPrice) : undefined,
    flashSaleEndTime: flashSaleEndTime || undefined,
  });

  const followers = await Follow.find({ vendor: req.user.id }).select("user");
  await createBulkNotifications(
    followers.map((entry) => ({
      recipient: entry.user,
      type: "new_product",
      title: "New product from a vendor you follow",
      message: `${req.user.name} added ${product.name}.`,
      metadata: { productId: product.id, vendorId: req.user.id },
    })),
  );

  res.status(201).json({
    success: true,
    message: "Product created successfully.",
    product,
  });
});

export const updateProduct = asyncHandler(async (req, res) => {
  await ensureVendorCanSell(req.user.id);

  const product = await Product.findOne({ _id: req.params.id, vendor: req.user.id });
  if (!product) {
    throw new ApiError(404, "Product not found.");
  }

  if (req.body.name !== undefined) {
    product.name = req.body.name;
  }

  if (req.body.price !== undefined) {
    product.price = Number(req.body.price);
  }

  if (req.body.deliveryFee !== undefined) {
    product.deliveryFee = parseDeliveryFeeInput(req.body.deliveryFee, {
      fallback: product.deliveryFee ?? DEFAULT_DELIVERY_FEE,
    });
  }

  if (req.body.description !== undefined) {
    product.description = req.body.description;
  }

  if (req.body.category !== undefined) {
    product.category = req.body.category;
  }

  if (req.body.isFlashSale !== undefined) {
    product.isFlashSale = req.body.isFlashSale === "true" || req.body.isFlashSale === true;
  }

  if (req.body.discountPrice !== undefined) {
    product.discountPrice = req.body.discountPrice ? Number(req.body.discountPrice) : undefined;
  }

  if (req.body.flashSaleEndTime !== undefined) {
    product.flashSaleEndTime = req.body.flashSaleEndTime || undefined;
  }

  if (req.files?.length) {
    let imagePaths = req.files.map((file) => `/uploads/products/${file.filename}`);

    if (hasCloudflareR2Config()) {
      const uploadedImages = await uploadProductImagesToR2(req.files, (_file, index) => ({
        type: "product",
        vendorId: req.user.id,
        productId: product.id,
        productName: product.name,
        slot: index,
      }));
      imagePaths = uploadedImages.map((entry) => entry.url);
    }

    product.image = imagePaths[0];
    product.images = imagePaths;
  }

  await product.save();

  res.json({
    success: true,
    message: "Product updated successfully.",
    product,
  });
});

export const deleteProduct = asyncHandler(async (req, res) => {
  await ensureVendorCanSell(req.user.id);

  const product = await Product.findOne({ _id: req.params.id, vendor: req.user.id });
  if (!product) {
    throw new ApiError(404, "Product not found.");
  }

  product.isActive = false;
  await product.save();

  res.json({
    success: true,
    message: "Product archived successfully.",
  });
});
