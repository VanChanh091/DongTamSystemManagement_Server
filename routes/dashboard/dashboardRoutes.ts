import { Router } from "express";
import authenticate from "../../middlewares/authMiddleware";
import {
  exportExcelDbPlanning,
  getAllDashboardPlanning,
} from "../../controller/dashboard/dashboardController";

const router = Router();

router.get("/paper", authenticate, getAllDashboardPlanning);

router.post("/exportExcel", authenticate, exportExcelDbPlanning);

export default router;
