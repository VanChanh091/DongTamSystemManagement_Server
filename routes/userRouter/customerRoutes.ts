import Router from "express";
import {
  checkCustomerInOrders,
  createCustomer,
  deleteCustomer,
  exportExcelCustomer,
  getCustomers,
  getUserSales,
  updateCustomer,
} from "../../controller/user/customer/customerController";
import authenticate from "../../middlewares/authMiddleware";
import { authorizeSaleAccess } from "./orderRoutes";

const router = Router();

router.get("/", authenticate, getCustomers);
router.get("/order-count", authenticate, checkCustomerInOrders);
router.get("/user-sales", authenticate, getUserSales);

router.post("/", authenticate, authorizeSaleAccess(), createCustomer);
router.put("/", authenticate, authorizeSaleAccess(), updateCustomer);
router.delete("/", authenticate, authorizeSaleAccess(), deleteCustomer);

router.post("/export", authenticate, authorizeSaleAccess(), exportExcelCustomer);

export default router;
