import Router from "express";
import {
  addOrder,
  deleteOrder,
  updateOrder,
  getOrderPendingAndReject,
  getOrderAcceptAndPlanning,
  getOrderByField,
  getOrderDetail,
  getOrderIdRaw,
} from "../../controller/user/order/orderController";
import authenticate from "../../middlewares/authMiddleware";
import { authorizeAnyPermission } from "../../middlewares/permissionMiddleware";

const router = Router();

//===============================ACCEPT AND PLANNING=====================================

router.get(
  "/accept-planning",
  authenticate,
  authorizeAnyPermission(["sale"]),
  getOrderAcceptAndPlanning,
);

router.get("/filter", authenticate, authorizeAnyPermission(["sale"]), getOrderByField);

//===============================PENDING AND REJECT=====================================

router.get(
  "/pending-reject",
  authenticate,
  authorizeAnyPermission(["sale"]),
  getOrderPendingAndReject,
);
router.post("/", authenticate, authorizeAnyPermission(["sale"]), addOrder);
router.put("/orders", authenticate, authorizeAnyPermission(["sale"]), updateOrder);
router.delete("/orders", authenticate, authorizeAnyPermission(["sale"]), deleteOrder);

//===============================ORDER AUTOCOMPLETE=====================================

router.get("/getOrderIdRaw", authenticate, authorizeAnyPermission(["sale"]), getOrderIdRaw);
router.get("/getOrderDetail", authenticate, authorizeAnyPermission(["sale"]), getOrderDetail);

export default router;
