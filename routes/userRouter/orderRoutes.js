import Router from "express";
import {
  addOrder,
  deleteOrder,
  updateOrder,
  getOrderPendingAndReject,
  getOrderAcceptAndPlanning,
  getOrderByField,
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
router.get("/filter", authenticate, authorizeAnyPermission(["sale"]), getOrderByField);
router.post("/", authenticate, authorizeAnyPermission(["sale"]), addOrder);
router.put("/orders", authenticate, authorizeAnyPermission(["sale"]), updateOrder);
router.delete("/orders", authenticate, authorizeAnyPermission(["sale"]), deleteOrder);

export default router;
