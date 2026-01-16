import Router from "express";
import authenticate from "../../middlewares/authMiddleware";
import { authorizeAnyPermission } from "../../middlewares/permissionMiddleware";
import {
  confirmForDeliveryPlanning,
  confirmReadyDeliveryPlanning,
  createDeliveryPlan,
  getDeliveryPlanDetailForEdit,
  getPlanningDelivery,
  getPlanningEstimateTime,
  getPlanningPendingDelivery,
} from "../../controller/user/delivery/deliveryController";

const router = Router();

//===============================PLANNING ESTIMATE TIME==================================

router.get(
  "/getPlanningEstimate",
  authenticate,
  authorizeAnyPermission(["delivery"]),
  getPlanningEstimateTime
);
router.put(
  "/confirmReadyDelivery",
  authenticate,
  authorizeAnyPermission(["delivery"]),
  confirmReadyDeliveryPlanning
);

//=================================PLANNING DELIVERY=====================================

router.get("/getPlanningDelivery", authenticate, getPlanningDelivery);
router.get("/getPlanningPending", authenticate, getPlanningPendingDelivery);
router.get("/getDeliveryPlanDetail", authenticate, getDeliveryPlanDetailForEdit);
router.post("/createDeliveryPlan", authenticate, createDeliveryPlan);
router.put("/confirmDelivery", authenticate, confirmForDeliveryPlanning);

export default router;
