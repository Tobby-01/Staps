import mongoose from "mongoose";

import { ORDER_STATUS } from "../constants/order.js";
import { DEFAULT_DELIVERY_FEE, MAX_DELIVERY_FEE } from "../constants/marketplace.js";

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    deliveryFee: {
      type: Number,
      default: DEFAULT_DELIVERY_FEE,
      min: 0,
      max: MAX_DELIVERY_FEE,
    },
    deliveryDetails: {
      recipientName: {
        type: String,
        required: true,
        trim: true,
      },
      phone: {
        type: String,
        required: true,
        trim: true,
      },
      location: {
        type: String,
        required: true,
        trim: true,
      },
      address: {
        type: String,
        required: true,
        trim: true,
      },
      notes: {
        type: String,
        trim: true,
      },
    },
    shopperFeedback: {
      receivedOrder: {
        type: Boolean,
        default: false,
      },
      likedProduct: Boolean,
      rating: {
        type: Number,
        min: 1,
        max: 5,
      },
      comment: {
        type: String,
        trim: true,
      },
      submittedAt: Date,
    },
    status: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      default: ORDER_STATUS.PENDING,
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
    isConfirmed: {
      type: Boolean,
      default: false,
    },
    paymentReleased: {
      type: Boolean,
      default: false,
    },
    paystackReference: String,
    paymentChannel: {
      type: String,
      default: "paystack",
    },
    vendorTransferReference: String,
    vendorTransferCode: String,
    vendorTransferStatus: String,
    vendorTransferQueuedAt: Date,
    payoutRequestedAt: Date,
    payoutProcessedAt: Date,
    payoutProcessedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    cancelableUntil: Date,
    paidAt: Date,
    shippedAt: Date,
    deliveredAt: Date,
    confirmedAt: Date,
    completedAt: Date,
    canceledAt: Date,
  },
  { timestamps: true },
);

export const Order = mongoose.model("Order", orderSchema);
