import { VENDOR_SELLING_STATUS } from "../constants/vendor.js";
import { Vendor } from "../models/vendor.model.js";
import { ApiError } from "../utils/api-error.js";

const formatSuspensionDate = (value) =>
  value instanceof Date && !Number.isNaN(value.getTime())
    ? value.toLocaleString("en-NG", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "";

export const syncVendorSellingAccess = async (vendor) => {
  if (!vendor) {
    return null;
  }

  if (
    vendor.sellingStatus === VENDOR_SELLING_STATUS.SUSPENDED &&
    vendor.suspensionEndsAt &&
    vendor.suspensionEndsAt.getTime() <= Date.now()
  ) {
    vendor.sellingStatus = VENDOR_SELLING_STATUS.ACTIVE;
    vendor.suspensionEndsAt = undefined;
    vendor.sellingRestrictionReason = "";
    vendor.sellingStatusUpdatedAt = new Date();
    await vendor.save();
  }

  return vendor;
};

export const getVendorSellingRestrictionMessage = (vendor) => {
  if (!vendor) {
    return "Vendor profile not found.";
  }

  if (vendor.sellingStatus === VENDOR_SELLING_STATUS.BANNED) {
    return vendor.sellingRestrictionReason
      ? `This vendor has been banned from selling. Reason: ${vendor.sellingRestrictionReason}`
      : "This vendor has been banned from selling.";
  }

  if (vendor.sellingStatus === VENDOR_SELLING_STATUS.SUSPENDED) {
    const suspensionWindow = formatSuspensionDate(vendor.suspensionEndsAt);
    const suspensionReason = vendor.sellingRestrictionReason
      ? ` Reason: ${vendor.sellingRestrictionReason}`
      : "";

    return suspensionWindow
      ? `This vendor is suspended from selling until ${suspensionWindow}.${suspensionReason}`
      : `This vendor is currently suspended from selling.${suspensionReason}`;
  }

  return "";
};

export const ensureVendorCanSell = async (userId) => {
  const vendorProfile = await Vendor.findOne({ user: userId });

  if (!vendorProfile?.verified) {
    throw new ApiError(403, "Only verified vendors can manage products.");
  }

  await syncVendorSellingAccess(vendorProfile);

  if (vendorProfile.sellingStatus !== VENDOR_SELLING_STATUS.ACTIVE) {
    throw new ApiError(403, getVendorSellingRestrictionMessage(vendorProfile));
  }

  return vendorProfile;
};

export const listSellableVendorProfiles = async (userIds = []) => {
  if (!userIds.length) {
    return [];
  }

  const vendorProfiles = await Vendor.find({
    user: { $in: userIds },
    verified: true,
  });

  const normalizedProfiles = await Promise.all(
    vendorProfiles.map((vendorProfile) => syncVendorSellingAccess(vendorProfile)),
  );

  return normalizedProfiles.filter(
    (vendorProfile) => vendorProfile.sellingStatus === VENDOR_SELLING_STATUS.ACTIVE,
  );
};
