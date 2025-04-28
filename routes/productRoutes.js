import { Router } from "express";
import {
  addProduct,
  deleteProduct,
  getAllProduct,
  getProductById,
  getProductByName,
  updateProduct,
} from "../controller/product/productController.js";
import authenticate from "../middlewares/authMiddleware.js";

const router = Router();

router.get("/", authenticate, getAllProduct);
router.get("/productId", authenticate, getProductById);
router.get("/productName", authenticate, getProductByName);
router.post("/", authenticate, addProduct);
router.put("/updateProduct", authenticate, updateProduct);
router.delete("/:id", authenticate, deleteProduct);

export default router;
