import Router from "express";
import authenticate from "../../middlewares/authMiddleware";
import { authorizeAccess } from "../../middlewares/permissionMiddleware";
import {
  countDebtDeduction,
  countDeliveryRequest,
  countOrderPending,
  countOrderPendingPlanning,
  countPlanningStop,
  countRequestPrepareGoods,
  countWaitingCheck,
} from "../../controller/badge/badgeController";

const router = Router();

const authorizePlanningAccess = () =>
  authorizeAccess({ departments: ["Operation"], permissions: ["plan"], requireDept: true });

//pending order
router.get(
  "/count-pending",
  authenticate,
  authorizeAccess({ departments: ["Sale"], permissions: ["manager"], requireDept: true }),
  countOrderPending,
);

//order pending planning
router.get(
  "/count-pending-planning",
  authenticate,
  authorizePlanningAccess(),
  countOrderPendingPlanning,
);

//planning stop
router.get("/count-planning-stop", authenticate, authorizePlanningAccess(), countPlanningStop);

//waiting check paper & box
router.get(
  "/count-waiting-check",
  authenticate,
  authorizeAccess({ departments: ["QC"], permissions: ["QC"], requireDept: true }),
  countWaitingCheck,
);

//delivery request
router.get(
  "/count-delivery-request",
  authenticate,
  authorizePlanningAccess(),
  countDeliveryRequest,
);

//prepare goods
router.get(
  "/count-prepare-goods",
  authenticate,
  authorizeAccess({ departments: ["Delivery"], permissions: ["delivery"], requireDept: true }),
  countRequestPrepareGoods,
);

//debt deduction
router.get(
  "/count-debt-deduction",
  authenticate,
  authorizeAccess({ departments: ["Accountant"], permissions: ["accountant"], requireDept: true }),
  countDebtDeduction,
);

export default router;
