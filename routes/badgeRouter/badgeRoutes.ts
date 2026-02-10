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
router.get("/countPending", authenticate, authorizeAnyPermission(["admin"]), countOrderPending);

//order reject
router.get("/countRejected", authenticate, authorizeAnyPermission(["sale"]), countOrderRejected);

//order pending planning
router.get(
  "/countPendingPlanning",
  authenticate,
  authorizeAnyPermission(["plan"]),
  countOrderPendingPlanning,
);

//planning stop
router.get("/countPlanningStop", authenticate, authorizeAnyPermission(["plan"]), countPlanningStop);

//waiting check paper & box
router.get(
  "/countWaitingCheckPaper",
  authenticate,
  authorizeAnyPermission(["QC"]),
  countWaitingCheckPaper,
);
router.get(
  "/countWaitingCheckBox",
  authenticate,
  authorizeAnyPermission(["QC"]),
  countWaitingCheckBox,
);

export default router;
