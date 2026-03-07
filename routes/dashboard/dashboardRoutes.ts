import { Router } from "express";
import authenticate from "../../middlewares/authMiddleware";
import {
  exportExcelDbPlanning,
  getDashboardPlanning,
  getDbPlanningDetail,
} from "../../controller/dashboard/dashboardController";

const router = Router();

router.get("/", authenticate, getDashboardPlanning);
router.get("/detail", authenticate, getDbPlanningDetail);
router.post("/export", authenticate, exportExcelDbPlanning);

export default router;
