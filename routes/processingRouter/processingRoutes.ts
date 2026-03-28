import Router from "express";
import upload from "../../utils/image/uploadImage";
import authenticate from "../../middlewares/authMiddleware";
import {
  bulkImportCustomers,
  bulkImportOrdersController,
  bulkImportProducts,
} from "../../controller/processingData/processingDataController";

const router = Router();

router.post("/order", authenticate, upload.single("order"), bulkImportOrdersController);
router.post("/customer", authenticate, upload.single("customer"), bulkImportCustomers);
router.post("/product", authenticate, upload.single("product"), bulkImportProducts);

export default router;
