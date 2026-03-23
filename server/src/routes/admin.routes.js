import { Router } from "express";

import {
  adminDashboard,
  approveVendor,
  listOrdersAdmin,
  listProductsAdmin,
  listUsers,
  listVendorsForReview,
} from "../controllers/admin.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { isAdmin } from "../middlewares/is-admin.middleware.js";

const router = Router();

router.use(authMiddleware, isAdmin);

router.get("/dashboard", adminDashboard);
router.get("/users", listUsers);
router.get("/vendors", listVendorsForReview);
router.patch("/vendors/:id/approve", approveVendor);
router.get("/products", listProductsAdmin);
router.get("/orders", listOrdersAdmin);

export default router;

