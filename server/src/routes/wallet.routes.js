import { Router } from "express";

import { ROLES } from "../constants/roles.js";
import { authMiddleware, authorizeRoles } from "../middlewares/auth.middleware.js";
import {
  getMyWallet,
  getMyWalletFundingAccount,
  initializeWalletFunding,
  provisionMyWalletFundingAccount,
} from "../controllers/wallet.controller.js";

const router = Router();

router.use(authMiddleware, authorizeRoles(ROLES.USER));
router.get("/", getMyWallet);
router.post("/fund/initialize", initializeWalletFunding);
router.get("/fund/account", getMyWalletFundingAccount);
router.post("/fund/account", provisionMyWalletFundingAccount);

export default router;
