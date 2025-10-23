import { Router } from "express";
import authenticate from "../../middlewares/authMiddleware.js";
import {
  addProduct,
  deleteProduct,
  exportExcelProduct,
  getAllProduct,
  getProductByField,
  updateProduct,
} from "../../controller/user/product/productController.js";
import upload from "../../utils/image/uploadImage.js";
import { authorizeAnyPermission } from "../../middlewares/permissionMiddleware.js";

const router = Router();

router.get("/", authenticate, getAllProduct);
router.get("/filter", authenticate, getProductByField);

router.post("/exportExcel", authenticate, exportExcelProduct);
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
