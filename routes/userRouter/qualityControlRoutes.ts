import { Router } from "express";
import authenticate from "../../middlewares/authMiddleware";
import {
  confirmFinalizeSession,
  createNewCriteria,
  createNewResult,
  createNewSession,
  getAllQcCriteria,
  getAllQcResult,
  getAllQcSession,
  submitQC,
  updateCriteria,
  updateResult,
  updateSession,
} from "../../controller/QC/qcController";

const router = Router();

//==================QC CRITERIA=====================
router.get("/getCriteria", authenticate, getAllQcCriteria);
router.post("/newCriteria", authenticate, createNewCriteria);
router.put("/updateCriteria", authenticate, updateCriteria);

//==================QC SESSION======================
router.get("/getSession", authenticate, getAllQcSession);
router.post("/newSession", authenticate, createNewSession);
router.put("/updateSession", authenticate, updateSession);

//==================QC RESULT=======================
router.get("/getResult", authenticate, getAllQcResult);
router.post("/newResult", authenticate, createNewResult);
router.put("/updateResult", authenticate, updateResult);
router.put("/confirmFinalize", authenticate, confirmFinalizeSession);

//==================ORCHESTRATOR=======================
router.post("/submitQC", authenticate, submitQC);

export default router;
