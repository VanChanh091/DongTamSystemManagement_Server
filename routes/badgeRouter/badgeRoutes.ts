import Router from "express";
import authenticate from "../../middlewares/authMiddleware";
import { authorizeAnyPermission } from "../../middlewares/permissionMiddleware";
import {
  countOrderPending,
  countOrderPendingPlanning,
  countOrderRejected,
  countPlanningStop,
  countWaitingCheckBox,
  countWaitingCheckPaper,
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
router.get(
  "/count-waiting-check/paper",
  authenticate,
  authorizeAnyPermission(["QC"]),
  countWaitingCheckPaper,
);
router.get(
  "/count-waiting-check/box",
  authenticate,
  authorizeAnyPermission(["QC"]),
  countWaitingCheckBox,
);

export default router;
