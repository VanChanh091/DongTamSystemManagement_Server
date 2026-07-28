import { Router } from "express";
import authenticate from "../../middlewares/authMiddleware";
import {
  exportExcelReportBox,
  exportExcelReportPaper,
  getReportBoxes,
  getReportQcInspectionSummary,
  getReportPapers,
} from "../../controller/user/report/reportPlanningController";
import { getQcInspection } from "../../controller/user/QC/qcInspectionController";

const router = Router();

//==================PAPER AND BOX====================
router.get("/paper", authenticate, getReportPapers);
router.get("/box", authenticate, getReportBoxes);

//==================INSPECTION====================
router.get("/inspection", authenticate, getQcInspection);
router.get("/inspection/summary", authenticate, getReportQcInspectionSummary);

//==================EXPORT EXCEL=====================
router.post("/export-paper", authenticate, exportExcelReportPaper);
router.post("/export-box", authenticate, exportExcelReportBox);

export default router;
