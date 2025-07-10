import Router from "express";
import {
  addOrder,
  deleteOrder,
  updateOrder,
  getOrderByPrice,
  getOrderByQcBox,
  getOrderByCustomerName,
  getOrderByProductName,
  getOrderPendingAndReject,
  getOrderAcceptAndPlanning,
} from "../../controller/user/order/orderController.js";
import authenticate from "../../middlewares/authMiddleware.js";
import { authorizeAnyPermission } from "../../middlewares/permissionMiddleware.js";

const router = Router();

router.get(
  "/pending-reject",
  authenticate,
  authorizeAnyPermission(["sale"]),
  getOrderPendingAndReject
);
router.get(
  "/accept-planning",
  authenticate,
  authorizeAnyPermission(["sale"]),
  getOrderAcceptAndPlanning
);
router.get(
  "/qcBox",
  authenticate,
  authorizeAnyPermission(["sale"]),
  getOrderByQcBox
);
router.get(
  "/price",
  authenticate,
  authorizeAnyPermission(["sale"]),
  getOrderByPrice
);
router.get(
  "/customerName",
  authenticate,
  authorizeAnyPermission(["sale"]),
  getOrderByCustomerName
);
router.get(
  "/productName",
  authenticate,
  authorizeAnyPermission(["sale"]),
  getOrderByProductName
);
router.post("/", authenticate, authorizeAnyPermission(["sale"]), addOrder);
router.put(
  "/orders",
  authenticate,
  authorizeAnyPermission(["sale"]),
  updateOrder
);
router.delete(
  "/orders",
  authenticate,
  authorizeAnyPermission(["sale"]),
  deleteOrder
);

export default router;
