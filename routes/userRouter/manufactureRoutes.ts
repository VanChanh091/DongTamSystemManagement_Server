import { Router } from "express";
import authenticate from "../../middlewares/authMiddleware";
import {
  addReportBox,
  addReportPaper,
  getPlanningPaper,
  getPlanningBox,
  confirmProducingPaper,
  confirmProducingBox,
  inboundQtyPaper,
  inboundQtyBox,
} from "../../controller/user/manufacture/manufactureController";
import { authorizeAnyPermission } from "../../middlewares/permissionMiddleware";

const router = Router();

//=========================PAPER=========================
router.get("/planningPaper", authenticate, getPlanningPaper);
router.post(
  "/reportPaper",
  authenticate,
  authorizeAnyPermission(["machine1350", "machine1900", "machine2Layer", "MachineRollPaper"]),
  addReportPaper
);
router.post(
  "/producingPaper",
  authenticate,
  authorizeAnyPermission(["machine1350", "machine1900", "machine2Layer", "MachineRollPaper"]),
  confirmProducingPaper
);
router.post("/inboundPaper", authenticate, authorizeAnyPermission(["QC"]), inboundQtyPaper);

//=========================BOX=========================
router.get("/planningBox", authenticate, getPlanningBox);
router.post("/reportBox", authenticate, authorizeAnyPermission(["step2Production"]), addReportBox);
router.post(
  "/producingBox",
  authenticate,
  authorizeAnyPermission(["step2Production"]),
  confirmProducingBox
);
router.post("/inboundBox", authenticate, authorizeAnyPermission(["QC"]), inboundQtyBox);

export default router;
