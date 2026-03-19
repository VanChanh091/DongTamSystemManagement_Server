import Router from "express";
import authenticate from "../../middlewares/authMiddleware";
import { authorizeAnyPermission } from "../../middlewares/permissionMiddleware";
import {
  cancelOrCompleteDeliveryPlan,
  confirmForDeliveryPlanning,
  createDeliveryPlan,
  exportScheduleDelivery,
  getAllScheduleDelivery,
  getPlanningEstimateTime,
  getPlanningRequest,
  registerQtyDelivery,
} from "../../controller/user/delivery/deliveryController";

const router = Router();

//===============================PLANNING ESTIMATE TIME==================================

router.get(
  "/estimate",
  authenticate,
  authorizeAnyPermission(["plan", "sale"]),
  getPlanningEstimateTime,
);
router.put(
  "/estimate",
  authenticate,
  authorizeAnyPermission(["plan", "sale"]),
  registerQtyDelivery,
);

//=================================DELIVERY PLANNING=====================================

// router.get("/planning", authenticate, authorizeAnyPermission(["plan"]), getPendingDelivery);
router.get("/planning", authenticate, authorizeAnyPermission(["plan"]), getPlanningRequest);
router.post("/planning", authenticate, authorizeAnyPermission(["plan"]), createDeliveryPlan);
router.put("/planning", authenticate, authorizeAnyPermission(["plan"]), confirmForDeliveryPlanning);

//=================================SCHEDULE DELIVERY=====================================
router.get("/schedule", authenticate, getAllScheduleDelivery);
router.put(
  "/schedule",
  authenticate,
  authorizeAnyPermission(["plan", "delivery"]),
  cancelOrCompleteDeliveryPlan,
);
router.post(
  "/schedule/export",
  authenticate,
  authorizeAnyPermission(["plan", "delivery"]),
  exportScheduleDelivery,
);

export default router;
