import { Router } from "express";
import authenticate from "../../middlewares/authMiddleware.js";
import {
  getReportByCustomerName,
  getReportByDayReported,
  getReportByGhepKho,
  getReportByQtyReported,
  getReportByShiftManagement,
  getReportPlanningBox,
  getReportPlanningPaper,
} from "../../controller/user/report/reportPlanningController.js";

const router = Router();

//==================Report Planning Paper=====================
router.get("/reportPaper", authenticate, getReportPlanningPaper);
router.get("/getCustomerName", authenticate, getReportByCustomerName);
router.get("/getDayReported", authenticate, getReportByDayReported);
router.get("/getQtyReported", authenticate, getReportByQtyReported);
router.get("/getGhepKho", authenticate, getReportByGhepKho);
router.get("/getShiftManagement", authenticate, getReportByShiftManagement);

//==================Report Planning Box=====================
router.get("/reportBox", authenticate, getReportPlanningBox);

export default router;
