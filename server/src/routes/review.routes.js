import { Router } from "express";

import { createReview, listReviews } from "../controllers/review.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/upload.middleware.js";

const router = Router();

router.get("/", listReviews);
router.post("/", authMiddleware, upload.single("image"), createReview);

export default router;

