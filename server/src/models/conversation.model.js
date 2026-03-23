import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    shopper: {
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
    lastMessageAt: Date,
  },
  { timestamps: true },
);

conversationSchema.index({ shopper: 1, vendor: 1 }, { unique: true });

export const Conversation = mongoose.model("Conversation", conversationSchema);
