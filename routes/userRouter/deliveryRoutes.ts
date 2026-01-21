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
  getDeliveryPlanDetailForEdit,
  getPlanningEstimateTime,
  getPlanningPendingDelivery,
} from "../../controller/user/delivery/deliveryController";

const router = Router();

//===============================PLANNING ESTIMATE TIME==================================

router.get(
  "/getPlanningEstimate",
  authenticate,
  authorizeAnyPermission(["plan", "sale"]),
  getPlanningEstimateTime,
);
router.put(
  "/confirmReadyDelivery",
  authenticate,
  authorizeAnyPermission(["plan", "sale"]),
  confirmReadyDeliveryPlanning,
);

//=================================PLANNING DELIVERY=====================================

router.get(
  "/getPlanningPending",
  authenticate,
  authorizeAnyPermission(["plan"]),
  getPlanningPendingDelivery,
);
router.get(
  "/getDeliveryPlanDetail",
  authenticate,
  authorizeAnyPermission(["plan"]),
  getDeliveryPlanDetailForEdit,
);
router.post(
  "/createDeliveryPlan",
  authenticate,
  authorizeAnyPermission(["plan"]),
  createDeliveryPlan,
);
router.put(
  "/confirmDelivery",
  authenticate,
  authorizeAnyPermission(["plan"]),
  confirmForDeliveryPlanning,
);

//=================================SCHEDULE DELIVERY=====================================
router.get("/getScheduleDelivery", authenticate, getAllScheduleDelivery);
router.put(
  "/updateStatusDelivery",
  authenticate,
  authorizeAnyPermission(["plan", "delivery"]),
  cancelOrCompleteDeliveryPlan,
);
router.post(
  "/exportExcel",
  authenticate,
  authorizeAnyPermission(["plan", "delivery"]),
  exportScheduleDelivery,
);

export default router;
