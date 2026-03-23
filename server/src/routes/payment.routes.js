import { Router } from "express";

import { verifyPaymentReference } from "../controllers/payment.controller.js";

const router = Router();

router.get("/verify/:reference", verifyPaymentReference);

export default router;
