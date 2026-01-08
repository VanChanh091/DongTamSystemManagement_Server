import Router from "express";
import authenticate from "../../middlewares/authMiddleware";
import { authorizeAnyPermission } from "../../middlewares/permissionMiddleware";
import {
  confirmForDeliveryPlanning,
  confirmReadyDeliveryPlanning,
  createDeliveryPlan,
  getPlanningDelivery,
  getPlanningEstimateTime,
} from "../../controller/user/delivery/deliveryController";

const router = Router();

//===============================PLANNING ESTIMATE TIME==================================

router.get(
  "/getPlanningEstimate",
  authenticate,
  authorizeAnyPermission(["delivery"]),
  getPlanningEstimateTime
);
router.post(
  "/confirmReadyDelivery",
  authenticate,
  authorizeAnyPermission(["delivery"]),
  confirmReadyDeliveryPlanning
);

//=================================PLANNING DELIVERY=====================================

router.get("/getPlanningDelivery", authenticate, getPlanningDelivery);
router.post("/createDeliveryPlan", authenticate, createDeliveryPlan);
router.post("/confirmDelivey", authenticate, confirmForDeliveryPlanning);

export default router;
