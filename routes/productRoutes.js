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
router.get("/:id", errorMiddlewareHandle, getProductById);
router.get("/search/:name", errorMiddlewareHandle, getProductByName);
router.post("/", errorMiddlewareHandle, addProduct);
router.put("/:id", errorMiddlewareHandle, updateProduct);
router.delete("/:id", errorMiddlewareHandle, deleteProduct);

export default router;
