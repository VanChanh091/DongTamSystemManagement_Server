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
import { AuthorizeAccessParams } from "../../interface/types";

const router = Router();

const authorizePlanAccess = ({
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

const canAccessManagerSale = authorizePlanAccess({
  departments: ["Sale"],
  permissions: ["sale"],
  roles: ["manager"],
  requireDept: false,
});

// ========================= PLANNING STATUS =========================
router.get("/planning-orders", authenticate, canAccessManagerSale, getOrderAccept);
router.post("/planning-orders", authenticate, canAccessManagerSale, planningOrder);
router.put("/planning-orders", authenticate, canAccessManagerSale, backOrderToReject);

// Planning stop
router.get("/planning-stops", authenticate, authorizePlanAccess(), getPlanningStop);
router.put("/planning-stops", authenticate, authorizePlanAccess(), cancelOrContinuePlannning);

// ========================= PLANNING PAPER =========================
router.get("/planning-papers", authenticate, getPlanningPapers);
router.post("/planning-papers", authenticate, canAccessManagerSale, updateIndex_TimeRunning);
router.put("/planning-papers", authenticate, canAccessManagerSale, handleUpdatePlanningPapers);
router.post("/export", authenticate, canAccessManagerSale, exportExcelPlanningPaper);

// ========================= PLANNING BOX =========================
router.get("/planning-boxes", authenticate, getPlanningBoxes);
router.post("/planning-boxes", authenticate, canAccessManagerSale, updateIndex_TimeRunningBox);
router.put("/planning-boxes", authenticate, canAccessManagerSale, updatePlanningBoxes);

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
router.post("/notify-planning", authenticate, authorizePlanAccess(), notifyUpdatePlanning);

export default router;
