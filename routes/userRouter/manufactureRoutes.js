import { Router } from "express";
import authenticate from "../../middlewares/authMiddleware.js";
import {
  addReportPaper,
  getPlanningPaper,
} from "../../controller/user/manufacture/manufacturePaperController.js";
import {
  getAllPlanning,
  getPlanningBox,
} from "../../controller/user/manufacture/manufactureBoxController.js";
import { authorizeAnyPermission } from "../../middlewares/permissionMiddleware.js";

const router = Router();

//=========================PAPER=========================
router.get("/planningPaper", authenticate, getPlanningPaper);
router.post(
  "/reportPaper",
  authenticate,
  authorizeAnyPermission(["production"]),
  addReportPaper
);

//=========================BOX=========================
router.get(
  "/planningBox",
  authenticate,
  authorizeAnyPermission(["production"]),
  getPlanningBox
);
router.get(
  "/getAllPlanning",
  authenticate,
  authorizeAnyPermission(["production"]),
  getAllPlanning
);

export default router;
