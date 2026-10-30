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
import { authorizeAccess, authorizeAnyPermission } from "../../middlewares/permissionMiddleware";
import { handleUpdateScrapReport } from "../../controller/user/scrap/scrapReportController";
import {
  checkingInspection,
  getQcInspectionErr,
} from "../../controller/user/QC/qcInspectionController";
import {
  createInspectionRequest,
  getInspectionRequest,
  getPendingInspectionRequests,
  qcReceivedRequest,
  updateInspectionRequest,
} from "../../controller/user/QC/inspectionRequestController";
import { AuthorizeAccessParams } from "../../interface/types";

const router = Router();

const authorizeQcAccess = ({
  departments = [],
  permissions = [],
  requireDept = true,
}: AuthorizeAccessParams = {}) =>
  authorizeAccess({
    departments: [...new Set(["QC", ...departments])],
    permissions: [...new Set(["QC", ...permissions])],
    requireDept,
  });

//==================QC SESSION======================
router.get("/session", authenticate, getQcSession);
router.post("/session", authenticate, authorizeQcAccess(), createNewSession);
router.put("/session", authenticate, authorizeQcAccess(), updateSession);

//==================QC RESULT=======================
router.get("/result", authenticate, getAllQcResult);
router.post("/result", authenticate, authorizeQcAccess(), createNewResult);
router.put("/result", authenticate, authorizeQcAccess(), updateResult);

//==================ORCHESTRATOR=======================
router.post("/submit", authenticate, authorizeQcAccess(), submitQC);

//====================QC SHIFT======================
router.get("/shift", authenticate, getCurrentShiftActive);
router.post("/shift/start", authenticate, authorizeQcAccess(), startShift);
router.put("/shift/end", authenticate, authorizeQcAccess(), endShift);

//==================INSPECTION REQUEST====================
router.get("/inspection-request/pending", authenticate, getPendingInspectionRequests);
router.get("/inspection-request/planning", authenticate, getInspectionRequest);
router.post("/inspection-request", authenticate, createInspectionRequest);
router.put("/inspection-request/receive", authenticate, authorizeQcAccess(), qcReceivedRequest);
router.put("/inspection-request", authenticate, authorizeQcAccess(), updateInspectionRequest);

//==================INSPECTION CHECK====================
router.post("/inspection", authenticate, authorizeQcAccess(), checkingInspection);

//using to check for producing
router.get("/inspection/check", authenticate, getQcInspectionErr);

//====================SCRAP REPORT======================
router.put("/scrap-report", authenticate, authorizeQcAccess(), handleUpdateScrapReport);

export default router;
