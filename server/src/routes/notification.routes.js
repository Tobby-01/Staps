import { Router } from "express";

import { listNotifications, markNotificationRead } from "../controllers/notification.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", authMiddleware, listNotifications);
router.patch("/:id/read", authMiddleware, markNotificationRead);

export default router;

