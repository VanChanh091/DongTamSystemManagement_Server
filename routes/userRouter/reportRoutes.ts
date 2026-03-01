import { Router } from "express";
import authenticate from "../../middlewares/authMiddleware";
import {
  exportExcelReportBox,
  exportExcelReportPaper,
  getReportBoxes,
  getReportPapers,
} from "../../controller/user/report/reportPlanningController";

const router = Router();

router.get("/paper", authenticate, getReportPapers);
router.get("/box", authenticate, getReportBoxes);

//==================EXPORT EXCEL=====================
router.post("/export-paper", authenticate, exportExcelReportPaper);
router.post("/export-box", authenticate, exportExcelReportBox);

export default router;
