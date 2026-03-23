import { Router } from "express";

import { listMyFollows, toggleFollowVendor } from "../controllers/follow.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", authMiddleware, listMyFollows);
router.post("/:vendorId", authMiddleware, toggleFollowVendor);

export default router;

