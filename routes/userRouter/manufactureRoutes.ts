import { Router } from "express";
import authenticate from "../../middlewares/authMiddleware";
import {
  addReportBox,
  addReportPaper,
  getPlanningPaper,
  getPlanningBox,
  updateReportPaper,
  updateReportBox,
} from "../../controller/user/manufacture/manufactureController";
import { authorizeAnyPermission } from "../../middlewares/permissionMiddleware";

const router = Router();

//=========================PAPER=========================
router.get("/paper", authenticate, getPlanningPaper);
router.post(
  "/paper",
  authenticate,
  authorizeAnyPermission(["machine1350", "machine1900", "machine2Layer", "MachineRollPaper"]),
  addReportPaper,
);
router.put(
  "/paper",
  authenticate,
  authorizeAnyPermission(["machine1350", "machine1900", "machine2Layer", "MachineRollPaper", "QC"]),
  updateReportPaper,
);

//=========================BOX=========================
router.get("/box", authenticate, getPlanningBox);
router.post("/box", authenticate, authorizeAnyPermission(["step2Production"]), addReportBox);
router.put(
  "/box",
  authenticate,
  authorizeAnyPermission(["step2Production", "QC"]),
  updateReportBox,
);

export default router;
