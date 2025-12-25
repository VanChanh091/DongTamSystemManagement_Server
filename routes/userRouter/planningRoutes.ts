import { Router } from "express";
import authenticate from "../../middlewares/authMiddleware";
import { authorizeAnyPermission } from "../../middlewares/permissionMiddleware";
import {
  changeMachinePlanning,
  confirmCompletePaper,
  getPlanningByMachine,
  getPlanningPaperByfield,
  notifyUpdatePlanning,
  pauseOrAcceptLackQtyPLanning,
  updateIndex_TimeRunning,
} from "../../controller/user/planning/planningPaperController";
import {
  acceptLackQtyBox,
  confirmCompleteBox,
  getPlanningBox,
  getPlanningBoxByfield,
  updateIndex_TimeRunningBox,
} from "../../controller/user/planning/planningBoxController";
import {
  getOrderAccept,
  getPlanningStop,
  planningOrder,
  cancelOrContinuePlannning,
} from "../../controller/user/planning/planningStatusController";

const router = Router();

//=========================WAITING FOR PLANNING=========================
router.get("/", authenticate, authorizeAnyPermission(["plan"]), getOrderAccept);
router.post("/planningOrder", authenticate, authorizeAnyPermission(["plan"]), planningOrder);

//=========================PLANNING PAPER=========================
router.get("/byMachinePaper", authenticate, authorizeAnyPermission(["plan"]), getPlanningByMachine);
router.get("/filterPaper", authenticate, authorizeAnyPermission(["plan"]), getPlanningPaperByfield);
router.post(
  "/updateIndex_TimeRunningPaper",
  authenticate,
  authorizeAnyPermission(["plan"]),
  updateIndex_TimeRunning
);
router.post(
  "/notifyPlanning",
  authenticate,
  authorizeAnyPermission(["plan"]),
  notifyUpdatePlanning
);
router.put(
  "/changeMachinePaper",
  authenticate,
  authorizeAnyPermission(["plan"]),
  changeMachinePlanning
);
router.put("/confirmPaper", authenticate, authorizeAnyPermission(["plan"]), confirmCompletePaper);
router.put(
  "/pauseOrAcceptLackQtyPaper",
  authenticate,
  authorizeAnyPermission(["plan"]),
  pauseOrAcceptLackQtyPLanning
);

//=========================PLANNING BOX=========================
router.get("/byMachineBox", authenticate, authorizeAnyPermission(["plan"]), getPlanningBox);
router.get("/filterBox", authenticate, authorizeAnyPermission(["plan"]), getPlanningBoxByfield);
router.post(
  "/updateIndex_TimeRunningBox",
  authenticate,
  authorizeAnyPermission(["plan"]),
  updateIndex_TimeRunningBox
);
router.put("/confirmBox", authenticate, authorizeAnyPermission(["plan"]), confirmCompleteBox);
router.put("/acceptLackQtyBox", authenticate, authorizeAnyPermission(["plan"]), acceptLackQtyBox);

//=========================PLANNING BOX=========================
router.get("/getPlanningStop", authenticate, authorizeAnyPermission(["plan"]), getPlanningStop);
router.put(
  "/updateStopById",
  authenticate,
  authorizeAnyPermission(["plan"]),
  cancelOrContinuePlannning
);

export default router;
