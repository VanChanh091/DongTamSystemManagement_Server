import Router from "express";
import authenticate from "../../middlewares/authMiddleware";
import { authorizeAnyPermission } from "../../middlewares/permissionMiddleware";
import {
  countDeliveryRequest,
  countOrderPending,
  countOrderPendingPlanning,
  countOrderRejected,
  countPlanningStop,
  countRequestPrepareGoods,
  countWaitingCheck,
} from "../../controller/badge/badgeController";

const router = Router();

//pending order
router.get("/count-pending", authenticate, authorizeAnyPermission(["admin"]), countOrderPending);

//order reject
router.get("/count-rejected", authenticate, authorizeAnyPermission(["sale"]), countOrderRejected);

//order pending planning
router.get(
  "/count-pending-planning",
  authenticate,
  authorizeAnyPermission(["plan"]),
  countOrderPendingPlanning,
);

//planning stop
router.get(
  "/count-planning-stop",
  authenticate,
  authorizeAnyPermission(["plan"]),
  countPlanningStop,
);

//waiting check paper & box
router.get("/count-waiting-check", authenticate, authorizeAnyPermission(["QC"]), countWaitingCheck);

//delivery request
router.get(
  "/count-delivery-request",
  authenticate,
  authorizeAnyPermission(["plan"]),
  countDeliveryRequest,
);

//prepare goods
router.get(
  "/count-prepare-goods",
  authenticate,
  authorizeAnyPermission(["delivery"]),
  countRequestPrepareGoods,
);

export default router;
