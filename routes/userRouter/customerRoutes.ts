import Router from "express";
import {
  checkCustomerInOrders,
  createCustomer,
  deleteCustomer,
  exportExcelCustomer,
  getCustomers,
  updateCustomer,
} from "../../controller/user/customer/customerController";
import authenticate from "../../middlewares/authMiddleware";
import { authorizeAnyPermission } from "../../middlewares/permissionMiddleware";

const router = Router();

router.get("/", authenticate, getCustomers);
router.get("/order-count", authenticate, checkCustomerInOrders);

router.post("/", authenticate, authorizeAnyPermission(["sale"]), createCustomer);
router.post("/export", authenticate, exportExcelCustomer);

router.put("/", authenticate, authorizeAnyPermission(["sale"]), updateCustomer);

router.delete("/", authenticate, authorizeAnyPermission(["sale"]), deleteCustomer);

export default router;
