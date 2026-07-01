import { Router } from "express";
import authenticate from "../../middlewares/authMiddleware";
import {
  createNewResult,
  createNewSession,
  getAllQcResult,
  getQcSession,
  submitQC,
  updateResult,
  updateSession,
} from "../../controller/user/QC/qcController";
import { authorizeAnyPermission } from "../../middlewares/permissionMiddleware";
import { handleUpdateScrapReport } from "../../controller/user/scrap/scrapReportController";
import {
  checkingInspection,
  getManufactureToCheck,
  getQcInspection,
} from "../../controller/user/QC/qcInspectionController";

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

//==================INSPECTION CHECK====================
router.get(
  "/inspection/manufacture",
  authenticate,
  authorizeAnyPermission(["QC"]),
  getManufactureToCheck,
);
router.get("/inspection", authenticate, authorizeAnyPermission(["QC"]), getQcInspection);
router.post("/inspection", authenticate, authorizeAnyPermission(["QC"]), checkingInspection);

//====================SCRAP REPORT======================
router.put("/scrap-report", authenticate, authorizeAnyPermission(["QC"]), handleUpdateScrapReport);

export default router;
