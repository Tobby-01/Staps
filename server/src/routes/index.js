import { Router } from "express";

import adminRoutes from "./admin.routes.js";
import authRoutes from "./auth.routes.js";
import chatRoutes from "./chat.routes.js";
import followRoutes from "./follow.routes.js";
import notificationRoutes from "./notification.routes.js";
import orderRoutes from "./order.routes.js";
import paymentRoutes from "./payment.routes.js";
import productRoutes from "./product.routes.js";
import reviewRoutes from "./review.routes.js";
import userRoutes from "./user.routes.js";
import vendorRoutes from "./vendor.routes.js";
import walletRoutes from "./wallet.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/chat", chatRoutes);
router.use("/vendors", vendorRoutes);
router.use("/products", productRoutes);
router.use("/orders", orderRoutes);
router.use("/payments", paymentRoutes);
router.use("/wallet", walletRoutes);
router.use("/reviews", reviewRoutes);
router.use("/follows", followRoutes);
router.use("/notifications", notificationRoutes);
router.use("/admin", adminRoutes);

export default router;
