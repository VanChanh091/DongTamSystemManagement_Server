import { Router } from "express";
import authenticate from "../../middlewares/authMiddleware.js";
import {
  addReportProduction,
  getReportByDayCompleted,
  getReportByShiftManagement,
  getReportProdByMachine,
} from "../../controller/user/report/reportProductionController.js";
import { authorizeAnyPermission } from "../../middlewares/permissionMiddleware.js";

const router = Router();

router.get(
  "/",
  authenticate,
  authorizeAnyPermission(["production"]),
  getReportProdByMachine
);
router.get(
  "/getByShiftManagement",
  authenticate,
  authorizeAnyPermission(["production"]),
  getReportByShiftManagement
);
router.get(
  "/getByDayCompleted",
  authenticate,
  authorizeAnyPermission(["production"]),
  getReportByDayCompleted
);
router.post(
  "/",
  authenticate,
  authorizeAnyPermission(["production"]),
  addReportProduction
);

export default router;
