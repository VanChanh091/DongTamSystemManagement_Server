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
import { AuthorizeAccessParams } from "../../interface/types";

const router = Router();

const authorizePlanningAccess = ({
  departments = [],
  permissions = [],
  requireDept = true,
  roles = [],
}: AuthorizeAccessParams = {}) =>
  authorizeAccess({
    departments: [...new Set(["Operation", ...departments])],
    permissions: [...new Set(["plan", ...permissions])],
    roles,
    requireDept,
  });

const canAccessManagerSale = authorizePlanningAccess({
  departments: ["Sale"],
  permissions: ["sale"],
  roles: ["manager"],
  requireDept: false,
});

//pending order
router.get(
  "/count-pending",
  authenticate,
  authorizeAccess({ departments: ["Sale"], roles: ["manager"], requireDept: true }),
  countOrderPending,
);

//order pending planning
router.get(
  "/count-pending-planning",
  authenticate,
  canAccessManagerSale,
  countOrderPendingPlanning,
);

//planning stop
router.get("/count-planning-stop", authenticate, canAccessManagerSale, countPlanningStop);

//waiting check paper & box
router.get(
  "/count-waiting-check",
  authenticate,
  authorizeAccess({ departments: ["QC"], permissions: ["QC"], requireDept: true }),
  countWaitingCheck,
);

//delivery request
router.get("/count-delivery-request", authenticate, canAccessManagerSale, countDeliveryRequest);

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
  authorizeAccess({ departments: ["Accountant"], roles: ["manager"], requireDept: true }),
  countDebtDeduction,
);

export default router;
