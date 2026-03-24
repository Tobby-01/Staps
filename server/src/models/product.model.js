import mongoose from "mongoose";

import {
  DEFAULT_DELIVERY_FEE,
  MAX_DELIVERY_FEE,
  MIN_DELIVERY_FEE,
} from "../constants/marketplace.js";

const productSchema = new mongoose.Schema(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    deliveryFee: {
      type: Number,
      default: DEFAULT_DELIVERY_FEE,
      min: MIN_DELIVERY_FEE,
      max: MAX_DELIVERY_FEE,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    image: String,
    images: {
      type: [String],
      default: [],
    },
    isFlashSale: {
      type: Boolean,
      default: false,
    },
    discountPrice: {
      type: Number,
      min: 0,
    },
    flashSaleEndTime: Date,
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

export const Product = mongoose.model("Product", productSchema);
