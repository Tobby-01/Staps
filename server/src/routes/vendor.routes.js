import { Router } from "express";

import {
  applyVendor,
  getVendorProfile,
  initializeVendorFee,
  listVerifiedVendors,
  listPayoutBanks,
  setupVendorPayout,
  updateVendorBranding,
  verifyVendorFee,
} from "../controllers/vendor.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/upload.middleware.js";

const router = Router();

router.get("/", listVerifiedVendors);
router.get("/me", authMiddleware, getVendorProfile);
router.get("/payout/banks", authMiddleware, listPayoutBanks);
router.post("/apply", authMiddleware, upload.single("idDocument"), applyVendor);
router.post("/payment/initialize", authMiddleware, initializeVendorFee);
router.get("/payment/verify/:reference", authMiddleware, verifyVendorFee);
router.post("/payout/setup", authMiddleware, setupVendorPayout);
router.patch("/branding", authMiddleware, upload.single("avatar"), updateVendorBranding);

export default router;
