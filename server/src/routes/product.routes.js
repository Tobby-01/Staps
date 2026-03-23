import { Router } from "express";

import {
  createProduct,
  deleteProduct,
  getProduct,
  listProducts,
  updateProduct,
} from "../controllers/product.controller.js";
import { ROLES } from "../constants/roles.js";
import { authMiddleware, authorizeRoles } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/upload.middleware.js";

const router = Router();

router.get("/", listProducts);
router.get("/:id", getProduct);
router.post(
  "/",
  authMiddleware,
  authorizeRoles(ROLES.VENDOR),
  upload.array("images", 6),
  createProduct,
);
router.patch(
  "/:id",
  authMiddleware,
  authorizeRoles(ROLES.VENDOR),
  upload.array("images", 6),
  updateProduct,
);
router.delete("/:id", authMiddleware, authorizeRoles(ROLES.VENDOR), deleteProduct);

export default router;
