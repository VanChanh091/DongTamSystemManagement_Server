import { Router } from "express";
import authenticate from "../../middlewares/authMiddleware";
import {
  addProduct,
  deleteProduct,
  exportExcelProduct,
  getProducts,
  updateProduct,
} from "../../controller/user/product/productController";
import upload from "../../utils/image/uploadImage";
import { authorizeAnyPermission } from "../../middlewares/permissionMiddleware";

const router = Router();

router.get("/", authenticate, getProducts);

router.post("/export", authenticate, exportExcelProduct);
router.post(
  "/",
  authenticate,
  upload.single("productImage"),
  authorizeAnyPermission(["sale"]),
  addProduct,
);

router.put(
  "/",
  authenticate,
  upload.single("productImage"),
  authorizeAnyPermission(["sale"]),
  updateProduct,
);

router.delete("/", authenticate, authorizeAnyPermission(["sale"]), deleteProduct);

export default router;
