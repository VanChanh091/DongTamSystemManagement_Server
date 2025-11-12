import Router from "express";
import {
  checkCustomerInOrders,
  createCustomer,
  deleteCustomer,
  exportExcelCustomer,
  getAllCustomer,
  getCustomerByField,
  updateCustomer,
} from "../../controller/user/customer/customerController";
import authenticate from "../../middlewares/authMiddleware";
import { authorizeAnyPermission } from "../../middlewares/permissionMiddleware";

const router = Router();

router.get("/", authenticate, getAllCustomer);
router.get("/filter", authenticate, getCustomerByField);
router.get("/orderCount", authenticate, checkCustomerInOrders);

router.post("/exportExcel", authenticate, exportExcelCustomer);
router.post("/", authenticate, authorizeAnyPermission(["sale"]), createCustomer);
router.put("/customerUp", authenticate, authorizeAnyPermission(["sale"]), updateCustomer);
router.delete("/customerDel", authenticate, authorizeAnyPermission(["sale"]), deleteCustomer);

export default router;
