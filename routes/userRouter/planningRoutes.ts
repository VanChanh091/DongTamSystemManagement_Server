import { Router } from "express";
import authenticate from "../../middlewares/authMiddleware";
import { authorizeAnyPermission } from "../../middlewares/permissionMiddleware";
import {
  getPlanningPapers,
  notifyUpdatePlanning,
  updateIndex_TimeRunning,
  updatePlanningPapers,
} from "../../controller/user/planning/planningPaperController";
import {
  getPlanningBoxes,
  updateIndex_TimeRunningBox,
  updatePlanningBoxes,
} from "../../controller/user/planning/planningBoxController";
import {
  getOrderAccept,
  getPlanningStop,
  planningOrder,
  cancelOrContinuePlannning,
} from "../../controller/user/planning/planningStatusController";

const router = Router();

//=========================PLANNING STATUS=========================
//planning order
router.get("/planning-orders", authenticate, authorizeAnyPermission(["plan"]), getOrderAccept);
router.post("/planning-orders", authenticate, authorizeAnyPermission(["plan"]), planningOrder);

//planning stop
router.get("/planning-stops", authenticate, authorizeAnyPermission(["plan"]), getPlanningStop);
router.put(
  "/planning-stops",
  authenticate,
  authorizeAnyPermission(["plan"]),
  cancelOrContinuePlannning,
);

//=========================PLANNING PAPER=========================
router.get("/planning-papers", authenticate, authorizeAnyPermission(["plan"]), getPlanningPapers);
router.post(
  "/planning-papers",
  authenticate,
  authorizeAnyPermission(["plan"]),
  updateIndex_TimeRunning,
);
router.put(
  "/planning-papers",
  authenticate,
  authorizeAnyPermission(["plan"]),
  updatePlanningPapers,
);

//=========================PLANNING BOX=========================
router.get("/planning-boxes", authenticate, authorizeAnyPermission(["plan"]), getPlanningBoxes);
router.post(
  "/planning-boxes",
  authenticate,
  authorizeAnyPermission(["plan"]),
  updateIndex_TimeRunningBox,
);
router.put("/planning-boxes", authenticate, authorizeAnyPermission(["plan"]), updatePlanningBoxes);

//socket
router.post(
  "/notify-planning",
  authenticate,
  authorizeAnyPermission(["plan"]),
  notifyUpdatePlanning,
);

export default router;
