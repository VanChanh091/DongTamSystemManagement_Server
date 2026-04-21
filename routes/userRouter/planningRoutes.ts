import { Router } from "express";
import authenticate from "../../middlewares/authMiddleware";
import { authorizeAnyPermission } from "../../middlewares/permissionMiddleware";
import {
  exportExcelPlanningPaper,
  getPlanningPapers,
  notifyUpdatePlanning,
  updateIndex_TimeRunning,
  handleUpdatePlanningPapers,
} from "../../controller/user/planning/planningPaperController";
import {
  getPlanningBoxes,
  updateIndex_TimeRunningBox,
  updatePlanningBoxes,
} from "../../controller/user/planning/planningBoxController";
import {
  getOrderAccept,
  getPlanningStop,
  planningOrder,
  cancelOrContinuePlannning,
  backOrderToReject,
} from "../../controller/user/planning/planningStatusController";

const router = Router();

//=========================PLANNING STATUS=========================
//planning order
router.get("/planning-orders", authenticate, authorizeAnyPermission(["plan"]), getOrderAccept);
router.post("/planning-orders", authenticate, authorizeAnyPermission(["plan"]), planningOrder);
router.put("/planning-orders", authenticate, authorizeAnyPermission(["plan"]), backOrderToReject);

//planning stop
router.get("/planning-stops", authenticate, authorizeAnyPermission(["plan"]), getPlanningStop);
router.put(
  "/planning-stops",
  authenticate,
  authorizeAnyPermission(["plan"]),
  cancelOrContinuePlannning,
);

//=========================PLANNING PAPER=========================
router.get("/planning-papers", authenticate, getPlanningPapers);
router.post(
  "/planning-papers",
  authenticate,
  authorizeAnyPermission(["plan"]),
  updateIndex_TimeRunning,
);
router.post("/export", authenticate, exportExcelPlanningPaper);
router.put(
  "/planning-papers",
  authenticate,
  authorizeAnyPermission(["plan"]),
  handleUpdatePlanningPapers,
);

//=========================PLANNING BOX=========================
router.get("/planning-boxes", authenticate, getPlanningBoxes);
router.post(
  "/planning-boxes",
  authenticate,
  authorizeAnyPermission(["plan"]),
  updateIndex_TimeRunningBox,
);
router.put("/planning-boxes", authenticate, authorizeAnyPermission(["plan"]), updatePlanningBoxes);

//socket
router.post(
  "/notify-planning",
  authenticate,
  authorizeAnyPermission(["plan"]),
  notifyUpdatePlanning,
);

export default router;
