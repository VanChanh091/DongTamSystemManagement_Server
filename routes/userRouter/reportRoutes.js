import { Router } from "express";
import authenticate from "../../middlewares/authMiddleware.js";
import {
  getReportPlanningBox,
  getReportPlanningPaper,
} from "../../controller/user/report/reportPlanningController.js";

const router = Router();

//==================Report Planning Paper=====================
router.get("/reportPaper", authenticate, getReportPlanningPaper);

//==================Report Planning Box=====================
router.get("/reportBox", authenticate, getReportPlanningBox);

export default router;
