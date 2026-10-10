import { Router } from "express";
import authenticate from "../../middlewares/authMiddleware";
import {
  createNewResult,
  createNewSession,
  endShift,
  getAllQcResult,
  getCurrentShiftActive,
  getQcSession,
  startShift,
  submitQC,
  updateResult,
  updateSession,
} from "../../controller/user/QC/qcController";
import { authorizeAnyPermission } from "../../middlewares/permissionMiddleware";
import { handleUpdateScrapReport } from "../../controller/user/scrap/scrapReportController";
import {
  checkingInspection,
  getQcInspectionErr,
} from "../../controller/user/QC/qcInspectionController";
import {
  createInspectionRequest,
  getInspectionRequestByPlanningId,
  getPendingInspectionRequests,
  qcReceivedRequest,
  updateInspectionRequest,
} from "../../controller/user/QC/inspectionRequestController";

const router = Router();

//==================QC SESSION======================
router.get("/session", authenticate, getQcSession);
router.post("/session", authenticate, authorizeAnyPermission(["QC"]), createNewSession);
router.put("/session", authenticate, authorizeAnyPermission(["QC"]), updateSession);

//==================QC RESULT=======================
router.get("/result", authenticate, getAllQcResult);
router.post("/result", authorizeAnyPermission(["QC"]), authenticate, createNewResult);
router.put("/result", authorizeAnyPermission(["QC"]), authenticate, updateResult);

//==================ORCHESTRATOR=======================
router.post("/submit", authenticate, authorizeAnyPermission(["QC"]), submitQC);

//====================QC SHIFT======================
router.get("/shift", authenticate, getCurrentShiftActive);
router.post("/shift/start", authenticate, authorizeAnyPermission(["QC"]), startShift);
router.put("/shift/end", authenticate, authorizeAnyPermission(["QC"]), endShift);

//==================INSPECTION REQUEST====================
router.get("/pending", authenticate, getPendingInspectionRequests);
router.get("/planning", authenticate, getInspectionRequestByPlanningId);
router.post("/", authenticate, createInspectionRequest);
router.put("/receive", authenticate, authorizeAnyPermission(["QC"]), qcReceivedRequest);
router.put("/", authenticate, authorizeAnyPermission(["QC"]), updateInspectionRequest);

//==================INSPECTION CHECK====================
router.post("/inspection", authenticate, authorizeAnyPermission(["QC"]), checkingInspection);

//using to check for producing
router.get("/inspection/check", authenticate, getQcInspectionErr);

//====================SCRAP REPORT======================
router.put("/scrap-report", authenticate, authorizeAnyPermission(["QC"]), handleUpdateScrapReport);

export default router;
