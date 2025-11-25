import { Router } from "express";
import authenticate from "../../middlewares/authMiddleware";
import {
  exportExcelDbPlanning,
  getAllDashboardPlanning,
  getAllDbPlanningStage,
  getDbPlanningByFields,
  getDbPlanningDetail,
} from "../../controller/dashboard/dashboardController";

const router = Router();

router.get("/paper", authenticate, getAllDashboardPlanning);
router.get("/getDetail", authenticate, getDbPlanningDetail);
router.get("/getDbByField", authenticate, getDbPlanningByFields);
router.get("/getAll", authenticate, getAllDbPlanningStage);

router.post("/exportExcel", authenticate, exportExcelDbPlanning);

export default router;
