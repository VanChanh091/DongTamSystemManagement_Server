import { Router } from "express";
import authenticate from "../../middlewares/authMiddleware";
import {
  createNewResult,
  createNewSession,
  getAllQcResult,
  getQcSession,
  submitQC,
  updateResult,
  updateSession,
} from "../../controller/user/QC/qcController";
import { authorizeAnyPermission } from "../../middlewares/permissionMiddleware";

const router = Router();

//==================QC SESSION======================
router.get("/session", authenticate, getQcSession);
router.post("/session", authenticate, authorizeAnyPermission(["QC"]), createNewSession);
router.put("/session", authenticate, authorizeAnyPermission(["QC"]), updateSession);

//==================QC RESULT=======================
router.get("/result", authenticate, getAllQcResult);
router.post("/result", authorizeAnyPermission(["QC"]), authenticate, createNewResult);
router.put("/result", authorizeAnyPermission(["QC"]), authenticate, updateResult);

//==================ORCHESTRATOR=======================
router.post("/submit", authenticate, authorizeAnyPermission(["QC"]), submitQC);

export default router;
