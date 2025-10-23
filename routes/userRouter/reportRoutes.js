import { Router } from "express";
import authenticate from "../../middlewares/authMiddleware.js";
import {
  getReportPlanningPaper,
  getReportedPaperByField,
  getReportPlanningBox,
  getReportedBoxByField,
  exportExcelReportBox,
  exportExcelReportPaper,
} from "../../controller/user/report/reportPlanningController.js";

const router = Router();

//==================Report Planning Paper=====================
router.get("/reportPaper", authenticate, getReportPlanningPaper);
router.get("/reportPaper/filter", authenticate, getReportedPaperByField);

//==================Report Planning Box=====================
router.get("/reportBox", authenticate, getReportPlanningBox);
router.get("/reportBox/filter", authenticate, getReportedBoxByField);

//==================EXPORT EXCEL=====================
router.post("/exportExcelPaper", authenticate, exportExcelReportPaper);
router.post("/exportExcelBox", authenticate, exportExcelReportBox);

export default router;
