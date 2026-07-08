import Router from "express";
import upload from "../../utils/image/uploadImage";
import authenticate from "../../middlewares/authMiddleware";
import {
  bulkImportCustomers,
  bulkImportOrdersController,
  bulkImportProducts,
} from "../../controller/system/processingDataController";
import { authorizeRole } from "../../middlewares/permissionMiddleware";
import { cleanAllForeignKeysDb } from "../../controller/system/systemController";

const router = Router();

//processing data
router.post("/order", authenticate, upload.single("order"), bulkImportOrdersController);
router.post("/customer", authenticate, upload.single("customer"), bulkImportCustomers);
router.post("/product", authenticate, upload.single("product"), bulkImportProducts);

//clear foreign key
router.post("/clear-fk", authenticate, authorizeRole(["admin"]), cleanAllForeignKeysDb);

export default router;
