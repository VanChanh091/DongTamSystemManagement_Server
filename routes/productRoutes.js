import { Router } from "express";
import errorMiddlewareHandle from "../middlewares/errorMiddleWare.js";
import {
  addProduct,
  deleteProduct,
  getAllProduct,
  getProductById,
  getProductByName,
  updateProduct,
} from "../controller/product/productController.js";

const router = Router();

router.get("/", errorMiddlewareHandle, getAllProduct);
router.get("/productId", errorMiddlewareHandle, getProductById);
router.get("/productName", errorMiddlewareHandle, getProductByName);
router.post("/", errorMiddlewareHandle, addProduct);
router.put("/updateProduct", errorMiddlewareHandle, updateProduct);
router.delete("/:id", errorMiddlewareHandle, deleteProduct);

export default router;
