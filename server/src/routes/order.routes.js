import { Router } from "express";

import {
  autoConfirmDeliveredOrders,
  cancelOrder,
  confirmDelivery,
  initializeOrderPayment,
  listMyOrders,
  vendorAcceptOrder,
  vendorDeliverOrder,
  vendorRequestPayout,
  vendorShipOrder,
  verifyOrderPayment,
} from "../controllers/order.controller.js";
import { ROLES } from "../constants/roles.js";
import { authMiddleware, authorizeRoles } from "../middlewares/auth.middleware.js";
import { isAdmin } from "../middlewares/is-admin.middleware.js";

const router = Router();

router.post("/", authMiddleware, authorizeRoles(ROLES.USER, ROLES.VENDOR), initializeOrderPayment);
router.get("/", authMiddleware, listMyOrders);
router.get("/verify/:reference", authMiddleware, verifyOrderPayment);
router.patch("/:id/cancel", authMiddleware, cancelOrder);
router.patch("/:id/confirm-delivery", authMiddleware, authorizeRoles(ROLES.USER, ROLES.VENDOR), confirmDelivery);
router.patch("/:id/accept", authMiddleware, authorizeRoles(ROLES.VENDOR), vendorAcceptOrder);
router.patch("/:id/shipped", authMiddleware, authorizeRoles(ROLES.VENDOR), vendorShipOrder);
router.patch("/:id/request-payout", authMiddleware, authorizeRoles(ROLES.VENDOR), vendorRequestPayout);
router.patch("/:id/delivered", authMiddleware, authorizeRoles(ROLES.VENDOR), vendorDeliverOrder);
router.post("/internal/auto-confirm", authMiddleware, isAdmin, autoConfirmDeliveredOrders);

export default router;
