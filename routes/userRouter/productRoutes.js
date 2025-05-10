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
import upload from "../../utils/uploadImage.js";

const router = Router();

router.get("/", authenticate, getAllProduct);
router.get("/productId", authenticate, getProductById);
router.get("/productName", authenticate, getProductByName);
router.post("/", authenticate, upload.single("productImage"), addProduct);
router.put(
  "/updateProduct",
  authenticate,
  upload.single("productImage"),
  updateProduct
);
router.delete("/:id", authenticate, deleteProduct);

export default router;
