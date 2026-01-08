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

router.get("/getAllCustomer", authenticate, getAllCustomer);
router.get("/filter", authenticate, getCustomerByField);
router.get("/orderCount", authenticate, checkCustomerInOrders);

router.post("/newCustomer", authenticate, authorizeAnyPermission(["sale"]), createCustomer);
router.post("/exportExcel", authenticate, exportExcelCustomer);
router.put("/updateCus", authenticate, authorizeAnyPermission(["sale"]), updateCustomer);
router.delete("/deleteCus", authenticate, authorizeAnyPermission(["sale"]), deleteCustomer);

export default router;
