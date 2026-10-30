import Router from "express";
import authenticate from "../../middlewares/authMiddleware";
import { authorizeAccess, authorizeAnyPermission } from "../../middlewares/permissionMiddleware";
import {
  cancelOrCompleteDeliveryPlan,
  handlePostDeliveryRequest,
  exportScheduleDelivery,
  getAllScheduleDelivery,
  getPlanningEstimateTime,
  getPlanningRequest,
  getRequestPrepareGoods,
  handlePutDelivery,
  notifyPrepareGoods,
  handleUpdatePreparedGoods,
  getDeliveryItemsByOrderId,
  implementDeliveryPlan,
} from "../../controller/user/delivery/deliveryController";

const router = Router();

type DeliveryScope = "estimate" | "request" | "schedule" | "prepare";

const DELIVERY_POLICIES: Record<DeliveryScope, { departments: string[]; permissions: string[] }> = {
  estimate: { departments: ["Operation", "Sale"], permissions: ["plan", "sale"] },
  request: { departments: ["Operation"], permissions: ["plan"] },
  schedule: { departments: ["Operation", "Delivery"], permissions: ["plan", "delivery"] },
  prepare: { departments: ["Delivery"], permissions: ["delivery"] },
};

export const authorizeDeliveryAccess = (scope: DeliveryScope) => {
  const policy = DELIVERY_POLICIES[scope];

  return authorizeAccess({
    departments: policy.departments,
    permissions: policy.permissions,
    requireDept: true,
  });
};

//===============================PLANNING ESTIMATE TIME==================================
router.get("/estimate", authenticate, authorizeDeliveryAccess("estimate"), getPlanningEstimateTime);
router.put("/estimate", authenticate, authorizeDeliveryAccess("estimate"), handlePutDelivery);

//=================================DELIVERY REQUEST=====================================

router.get("/planning", authenticate, getPlanningRequest);
router.post(
  "/planning",
  authenticate,
  authorizeDeliveryAccess("request"),
  handlePostDeliveryRequest,
);
router.put("/planning", authenticate, authorizeDeliveryAccess("request"), implementDeliveryPlan);

//=================================SCHEDULE DELIVERY=====================================
router.get("/schedule", authenticate, getAllScheduleDelivery);
router.get("/schedule/get-search", authenticate, getDeliveryItemsByOrderId);
router.put(
  "/schedule",
  authenticate,
  authorizeDeliveryAccess("schedule"),
  cancelOrCompleteDeliveryPlan,
);
router.post(
  "/schedule/export",
  authenticate,
  authorizeDeliveryAccess("schedule"),
  exportScheduleDelivery,
);

//=================================PREPARE GOODS=====================================
router.get("/prepare", authenticate, getRequestPrepareGoods);
router.put("/prepare", authenticate, authorizeDeliveryAccess("prepare"), handleUpdatePreparedGoods);

//socket
router.post(
  "/notify-delivery",
  authenticate,
  authorizeDeliveryAccess("prepare"),
  notifyPrepareGoods,
);

export default router;
