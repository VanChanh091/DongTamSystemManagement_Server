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
  authorizeAnyPermission([
    "machine1350",
    "machine1900",
    "machine2Layer",
    "MachineRollPaper",
  ]),
  addReportPaper
);

//=========================BOX=========================
router.get("/planningBox", authenticate, getPlanningBox);
router.post(
  "/reportBox",
  authenticate,
  authorizeAnyPermission(["step2Production"]),
  addReportBox
);

export default router;
