import { Router } from "express";

import {
  getChatThread,
  listConversations,
  sendChatMessage,
} from "../controllers/chat.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/conversations", authMiddleware, listConversations);
router.get("/with/:userId", authMiddleware, getChatThread);
router.post("/with/:userId", authMiddleware, sendChatMessage);

export default router;
