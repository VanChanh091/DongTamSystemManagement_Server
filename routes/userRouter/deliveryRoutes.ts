import Router from "express";
import authenticate from "../../middlewares/authMiddleware";
import { authorizeAnyPermission } from "../../middlewares/permissionMiddleware";
import {
  cancelOrCompleteDeliveryPlan,
  confirmForDeliveryPlanning,
  confirmReadyDeliveryPlanning,
  createDeliveryPlan,
  exportScheduleDelivery,
  getAllScheduleDelivery,
  getPendingDelivery,
  getPlanningEstimateTime,
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
  confirmReadyDeliveryPlanning,
);

//=================================PLANNING DELIVERY=====================================

router.get("/planning", authenticate, authorizeAnyPermission(["plan"]), getPendingDelivery);
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
