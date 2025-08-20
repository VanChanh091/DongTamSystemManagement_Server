import { Router } from "express";
import authenticate from "../../middlewares/authMiddleware.js";
import { authorizeAnyPermission } from "../../middlewares/permissionMiddleware.js";
import {
  changeMachinePlanning,
  getOrderAccept,
  getPlanningByCustomerName,
  getPlanningByFlute,
  getPlanningByGhepKho,
  getPlanningByMachine,
  getPlanningByOrderId,
  pauseOrAcceptLackQtyPLanning,
  planningOrder,
  updateIndex_TimeRunning,
} from "../../controller/user/planning/planningPaperController.js";
import {
  acceptLackQtyBox,
  getPlanningBox,
  getPlanningBoxByCusName,
  getPlanningBoxByFlute,
  getPlanningBoxByOrderId,
  getPlanningBoxByQcBox,
  updateIndex_TimeRunningBox,
} from "../../controller/user/planning/planningBoxController.js";

const router = Router();

//=========================WAITING FOR PLANNING=========================
router.get("/", authenticate, authorizeAnyPermission(["plan"]), getOrderAccept);
router.post(
  "/planningOrder",
  authenticate,
  authorizeAnyPermission(["plan"]),
  planningOrder
);

//=========================PLANNING PAPER=========================
router.get(
  "/byMachinePaper",
  authenticate,
  authorizeAnyPermission(["plan"]),
  getPlanningByMachine
);
router.post(
  "/updateIndex_TimeRunningPaper",
  authenticate,
  authorizeAnyPermission(["plan"]),
  updateIndex_TimeRunning
);
router.put(
  "/changeMachinePaper",
  authenticate,
  authorizeAnyPermission(["plan"]),
  changeMachinePlanning
);
router.put(
  "/pauseOrAcceptLackQtyPaper",
  authenticate,
  authorizeAnyPermission(["plan"]),
  pauseOrAcceptLackQtyPLanning
);

//get properties of planning paper
router.get(
  "/getCusNamePaper",
  authenticate,
  authorizeAnyPermission(["plan"]),
  getPlanningByCustomerName
);
router.get(
  "/getFlutePaper",
  authenticate,
  authorizeAnyPermission(["plan"]),
  getPlanningByFlute
);
router.get(
  "/getGhepKhoPaper",
  authenticate,
  authorizeAnyPermission(["plan"]),
  getPlanningByGhepKho
);
router.get(
  "/getOrderIdPaper",
  authenticate,
  authorizeAnyPermission(["plan"]),
  getPlanningByOrderId
);

//=========================PLANNING BOX=========================
router.get(
  "/byMachineBox",
  authenticate,
  authorizeAnyPermission(["plan"]),
  getPlanningBox
);
router.post(
  "/updateIndex_TimeRunningBox",
  authenticate,
  authorizeAnyPermission(["plan"]),
  updateIndex_TimeRunningBox
);
router.put(
  "/acceptLackQtyBox",
  authenticate,
  authorizeAnyPermission(["plan"]),
  acceptLackQtyBox
);

//get properties of planning box
router.get(
  "/getOrderIdBox",
  authenticate,
  authorizeAnyPermission(["plan"]),
  getPlanningBoxByOrderId
);
router.get(
  "/getCusNameBox",
  authenticate,
  authorizeAnyPermission(["plan"]),
  getPlanningBoxByCusName
);
router.get(
  "/getFluteBox",
  authenticate,
  authorizeAnyPermission(["plan"]),
  getPlanningBoxByFlute
);
router.get(
  "/getQcBox",
  authenticate,
  authorizeAnyPermission(["plan"]),
  getPlanningBoxByQcBox
);

export default router;
