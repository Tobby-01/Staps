import mongoose from "mongoose";

import { VENDOR_SELLING_STATUS } from "../constants/vendor.js";

const vendorSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    idDocumentUrl: {
      type: String,
      required: true,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    sellingStatus: {
      type: String,
      enum: Object.values(VENDOR_SELLING_STATUS),
      default: VENDOR_SELLING_STATUS.ACTIVE,
      index: true,
    },
    suspensionEndsAt: Date,
    sellingRestrictionReason: {
      type: String,
      trim: true,
      default: "",
    },
    sellingStatusUpdatedAt: Date,
    sellingStatusUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "waived"],
      default: "pending",
    },
    payoutAccount: {
      bankCode: String,
      bankName: String,
      accountNumber: String,
      accountName: String,
      recipientCode: String,
      recipientId: Number,
      currency: {
        type: String,
        default: "NGN",
      },
      setupComplete: {
        type: Boolean,
        default: false,
      },
      lastSyncedAt: Date,
    },
    registrationReference: String,
    registrationPaidAt: Date,
    brandingLocked: {
      type: Boolean,
      default: false,
    },
    brandingUpdatedAt: Date,
  },
  { timestamps: true },
);

export const Vendor = mongoose.model("Vendor", vendorSchema);
