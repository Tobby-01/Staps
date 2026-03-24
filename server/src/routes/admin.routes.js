import { Router } from "express";

import {
  adminDashboard,
  approveVendor,
  banVendor,
  listOrdersAdmin,
  listPayoutRequests,
  listProductsAdmin,
  listUsers,
  listVendorsForReview,
  releaseRequestedPayout,
  restoreVendorSellingAccess,
  suspendVendor,
} from "../controllers/admin.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { isAdmin } from "../middlewares/is-admin.middleware.js";

const router = Router();

router.use(authMiddleware, isAdmin);

router.get("/dashboard", adminDashboard);
router.get("/users", listUsers);
router.get("/vendors", listVendorsForReview);
router.patch("/vendors/:id/approve", approveVendor);
router.patch("/vendors/:id/suspend", suspendVendor);
router.patch("/vendors/:id/ban", banVendor);
router.patch("/vendors/:id/restore", restoreVendorSellingAccess);
router.get("/products", listProductsAdmin);
router.get("/orders", listOrdersAdmin);
router.get("/payout-requests", listPayoutRequests);
router.patch("/orders/:id/release-payout", releaseRequestedPayout);

export default router;
