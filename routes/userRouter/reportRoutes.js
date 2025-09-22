import { Router } from "express";
import authenticate from "../../middlewares/authMiddleware.js";
import {
  exportExcelReportBox,
  exportExcelReportPaper,
  getReportBoxByCustomerName,
  getReportBoxByDayReported,
  getReportBoxByQcBox,
  getReportBoxByQtyReported,
  getReportBoxByShiftManagement,
  getReportPaperByCustomerName,
  getReportPaperByDayReported,
  getReportPaperByGhepKho,
  getReportPaperByQtyReported,
  getReportPaperByShiftManagement,
  getReportPlanningBox,
  getReportPlanningPaper,
} from "../../controller/user/report/reportPlanningController.js";

const router = Router();

//==================Report Planning Paper=====================
router.get("/reportPaper", authenticate, getReportPlanningPaper);
router.get("/reportPaper/getCustomerName", authenticate, getReportPaperByCustomerName);
router.get("/reportPaper/getDayReported", authenticate, getReportPaperByDayReported);
router.get("/reportPaper/getQtyReported", authenticate, getReportPaperByQtyReported);
router.get("/reportPaper/getGhepKho", authenticate, getReportPaperByGhepKho);
router.get("/reportPaper/getShiftManagement", authenticate, getReportPaperByShiftManagement);

//==================Report Planning Box=====================
router.get("/reportBox", authenticate, getReportPlanningBox);
router.get("/reportBox/getCustomerName", authenticate, getReportBoxByCustomerName);
router.get("/reportBox/getDayReported", authenticate, getReportBoxByDayReported);
router.get("/reportBox/getQtyReported", authenticate, getReportBoxByQtyReported);
router.get("/reportBox/getQcBox", authenticate, getReportBoxByQcBox);
router.get("/reportBox/getShiftManagement", authenticate, getReportBoxByShiftManagement);

//==================EXPORT EXCEL=====================
router.post("/exportExcelPaper", authenticate, exportExcelReportPaper);
router.post("/exportExcelBox", authenticate, exportExcelReportBox);

export default router;
