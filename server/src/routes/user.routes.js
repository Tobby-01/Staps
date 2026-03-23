import { Router } from "express";

import { getPublicUserProfile } from "../controllers/user.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/:id/profile", authMiddleware, getPublicUserProfile);

export default router;
