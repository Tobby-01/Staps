import { Router } from "express";

import { ROLES } from "../constants/roles.js";
import { authMiddleware, authorizeRoles } from "../middlewares/auth.middleware.js";
import {
  getMyWallet,
  initializeWalletFunding,
} from "../controllers/wallet.controller.js";

const router = Router();

router.use(authMiddleware, authorizeRoles(ROLES.USER));
router.get("/", getMyWallet);
router.post("/fund/initialize", initializeWalletFunding);

export default router;

