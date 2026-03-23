import mongoose from "mongoose";

const followSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

followSchema.index({ user: 1, vendor: 1 }, { unique: true });

export const Follow = mongoose.model("Follow", followSchema);

