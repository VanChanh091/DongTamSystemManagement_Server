import { Router } from "express";
import authenticate from "../../middlewares/authMiddleware";
import {
  addReportBox,
  addReportPaper,
  getPlanningPaper,
  getPlanningBox,
  confirmProducingPaper,
  confirmProducingBox,
  updateRequestStockCheck,
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
router.post(
  "/paper/confirm",
  authenticate,
  authorizeAnyPermission(["machine1350", "machine1900", "machine2Layer", "MachineRollPaper"]),
  confirmProducingPaper,
);
router.put(
  "/paper",
  authenticate,
  authorizeAnyPermission(["machine1350", "machine1900", "machine2Layer", "MachineRollPaper"]),
  updateReportPaper,
);

//=========================BOX=========================
router.get("/box", authenticate, getPlanningBox);
router.post("/box", authenticate, authorizeAnyPermission(["step2Production"]), addReportBox);
router.post(
  "/box/confirm",
  authenticate,
  authorizeAnyPermission(["step2Production"]),
  confirmProducingBox,
);
router.put(
  "/box",
  authenticate,
  authorizeAnyPermission(["step2Production"]),
  updateReportBox,
);
router.put(
  "/box/request",
  authenticate,
  authorizeAnyPermission(["step2Production"]),
  updateRequestStockCheck,
);

export default router;
