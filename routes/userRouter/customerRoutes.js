import Router from "express";
import {
  createCustomer,
  deleteCustomer,
  exportExcelCustomer,
  getAllCustomer,
  getByCSKH,
  getByCustomerName,
  getById,
  getBySDT,
  updateCustomer,
} from "../../controller/user/customer/customerController.js";
import authenticate from "../../middlewares/authMiddleware.js";
import { authorizeAnyPermission } from "../../middlewares/permissionMiddleware.js";

const router = Router();

router.get("/", authenticate, getAllCustomer);
router.get("/byCustomerId", authenticate, getById);
router.get("/byName", authenticate, getByCustomerName);
router.get("/byCskh", authenticate, getByCSKH);
router.get("/byPhone", authenticate, getBySDT);

router.post("/exportExcel", authenticate, exportExcelCustomer);
router.post("/", authenticate, authorizeAnyPermission(["sale"]), createCustomer);
router.put("/customerUp", authenticate, authorizeAnyPermission(["sale"]), updateCustomer);
router.delete("/customerDel", authenticate, authorizeAnyPermission(["sale"]), deleteCustomer);

export default router;
