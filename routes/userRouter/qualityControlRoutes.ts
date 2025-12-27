import { Router } from "express";
import authenticate from "../../middlewares/authMiddleware";
import {
  confirmFinalizeSession,
  createNewResult,
  createNewSession,
  getAllQcResult,
  getAllQcSession,
  getSessionByFk,
  submitQC,
  updateResult,
  updateSession,
} from "../../controller/user/QC/qcController";
import { authorizeAnyPermission } from "../../middlewares/permissionMiddleware";

const router = Router();

//==================QC SESSION======================
router.get("/getSession", authenticate, getAllQcSession);
router.get("/getSessionByFk", authenticate, getSessionByFk);
router.post("/newSession", authenticate, authorizeAnyPermission(["QC"]), createNewSession);
router.put("/updateSession", authenticate, authorizeAnyPermission(["QC"]), updateSession);

//==================QC RESULT=======================
router.get("/getResult", authenticate, getAllQcResult);
router.post("/newResult", authorizeAnyPermission(["QC"]), authenticate, createNewResult);
router.put("/updateResult", authorizeAnyPermission(["QC"]), authenticate, updateResult);
router.put(
  "/confirmFinalize",
  authorizeAnyPermission(["QC"]),
  authenticate,
  confirmFinalizeSession
);

//==================ORCHESTRATOR=======================
router.post("/submitQC", authenticate, authorizeAnyPermission(["QC"]), submitQC);

export default router;
