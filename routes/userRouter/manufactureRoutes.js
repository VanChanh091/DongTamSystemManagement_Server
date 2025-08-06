import { Router } from "express";
import authenticate from "../../middlewares/authMiddleware.js";
import {
  addReportBox,
  addReportPaper,
  getPlanningPaper,
  getPlanningBox,
} from "../../controller/user/manufacture/manufactureController.js";
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
router.get("/planningBox", authenticate, getPlanningBox);
router.post(
  "/reportBox",
  authenticate,
  authorizeAnyPermission(["production"]),
  addReportBox
);

export default router;
