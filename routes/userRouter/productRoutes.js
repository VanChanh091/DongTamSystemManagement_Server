import { Router } from "express";
import authenticate from "../../middlewares/authMiddleware.js";
import {
  addProduct,
  deleteProduct,
  getAllProduct,
  getProductById,
  getProductByName,
  updateProduct,
} from "../../controller/user/product/productController.js";
import upload from "../../utils/image/uploadImage.js";
import { authorizeAnyPermission } from "../../middlewares/permissionMiddleware.js";

const router = Router();

router.get("/", authenticate, getAllProduct);
router.get("/byProductId", authenticate, getProductById);
router.get("/byName", authenticate, getProductByName);
router.post(
  "/",
  authenticate,
  upload.single("productImage"),
  authorizeAnyPermission(["sale"]),
  addProduct
);
router.put(
  "/updateProduct",
  authenticate,
  upload.single("productImage"),
  authorizeAnyPermission(["sale"]),
  updateProduct
);
router.delete("/:id", authenticate, authorizeAnyPermission(["sale"]), deleteProduct);

export default router;
