import { Router } from "express";
import authenticate from "../../middlewares/authMiddleware";
import { authorizeAccess } from "../../middlewares/permissionMiddleware";
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
import {
  calculateSummaryByGhepKho,
  getPaperRequirements,
} from "../../controller/user/planning/paperRequirementController";

const router = Router();

const authorizePlanAccess = authorizeAccess({
  departments: ["Operation"],
  permissions: ["plan"],
  requireDept: true,
});

// ========================= PLANNING STATUS =========================
router.get("/planning-orders", authenticate, authorizePlanAccess, getOrderAccept);
router.post("/planning-orders", authenticate, authorizePlanAccess, planningOrder);
router.put("/planning-orders", authenticate, authorizePlanAccess, backOrderToReject);

// Planning stop
router.get("/planning-stops", authenticate, authorizePlanAccess, getPlanningStop);
router.put("/planning-stops", authenticate, authorizePlanAccess, cancelOrContinuePlannning);

// ========================= PLANNING PAPER =========================
router.get("/planning-papers", authenticate, getPlanningPapers);
router.post("/planning-papers", authenticate, authorizePlanAccess, updateIndex_TimeRunning);
router.put("/planning-papers", authenticate, authorizePlanAccess, handleUpdatePlanningPapers);
router.post("/export", authenticate, authorizePlanAccess, exportExcelPlanningPaper);

// ========================= PLANNING BOX =========================
router.get("/planning-boxes", authenticate, getPlanningBoxes);
router.post("/planning-boxes", authenticate, authorizePlanAccess, updateIndex_TimeRunningBox);
router.put("/planning-boxes", authenticate, authorizePlanAccess, updatePlanningBoxes);

// ========================= PAPER REQUIREMENTS =========================
router.get(
  "/paper-requirements",
  authenticate,
  authorizeAccess({ departments: ["Operation"], requireDept: true }),
  getPaperRequirements,
);
router.get(
  "/paper-requirements/summary",
  authenticate,
  authorizeAccess({ departments: ["Operation"] }),
  calculateSummaryByGhepKho,
);

// Socket notification
router.post("/notify-planning", authenticate, authorizePlanAccess, notifyUpdatePlanning);

export default router;
