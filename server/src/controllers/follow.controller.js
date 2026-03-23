import { Follow } from "../models/follow.model.js";
import { Vendor } from "../models/vendor.model.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";

export const toggleFollowVendor = asyncHandler(async (req, res) => {
  const vendorId = req.params.vendorId;
  const vendorProfile = await Vendor.findOne({ user: vendorId, verified: true });
  if (!vendorProfile) {
    throw new ApiError(404, "Vendor not found.");
  }

  const existing = await Follow.findOne({ user: req.user.id, vendor: vendorId });
  if (existing) {
    await existing.deleteOne();
    return res.json({
      success: true,
      following: false,
    });
  }

  await Follow.create({
    user: req.user.id,
    vendor: vendorId,
  });

  res.status(201).json({
    success: true,
    following: true,
  });
});

export const listMyFollows = asyncHandler(async (req, res) => {
  const follows = await Follow.find({ user: req.user.id }).populate("vendor", "name email");

  res.json({
    success: true,
    follows,
  });
});
