import { Router } from "express";
import authenticate from "../../middlewares/authMiddleware";
import {
  addProduct,
  deleteProduct,
  exportExcelProduct,
  getAllProduct,
  getProductByField,
  updateProduct,
} from "../../controller/user/product/productController";
import upload from "../../utils/image/uploadImage";
import { authorizeAnyPermission } from "../../middlewares/permissionMiddleware";

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
