import { Router } from "express";

import {
  login,
  logout,
  me,
  requestPasswordReset,
  resendSignupVerification,
  resetPassword,
  seedAdminHint,
  signup,
  updateProfile,
  verifySignup,
} from "../controllers/auth.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/upload.middleware.js";

const router = Router();

router.post("/signup", upload.single("avatar"), signup);
router.post("/signup/verify", verifySignup);
router.post("/signup/resend-pin", resendSignupVerification);
router.post("/login", login);
router.post("/forgot-password", requestPasswordReset);
router.post("/reset-password", resetPassword);
router.post("/logout", logout);
router.get("/me", authMiddleware, me);
router.patch("/me", authMiddleware, upload.single("avatar"), updateProfile);
router.get("/admin-hint", seedAdminHint);

export default router;
