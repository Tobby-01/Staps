import { Follow } from "../models/follow.model.js";
import { Product } from "../models/product.model.js";
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

  const imagePaths = (req.files || []).map((file) => `/uploads/products/${file.filename}`);

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
    const imagePaths = req.files.map((file) => `/uploads/products/${file.filename}`);
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
