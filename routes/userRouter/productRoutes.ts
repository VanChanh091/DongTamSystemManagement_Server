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
import { authorizeSaleAccess } from "./orderRoutes";

const router = Router();

router.get("/", authenticate, getProducts);

router.post("/", authenticate, upload.single("productImage"), authorizeSaleAccess(), addProduct);
router.put("/", authenticate, upload.single("productImage"), authorizeSaleAccess(), updateProduct);
router.delete("/", authenticate, authorizeSaleAccess(), deleteProduct);

router.post("/export", authenticate, authorizeSaleAccess(), exportExcelProduct);

export default router;
