import { Router } from "express";
import authenticate from "../../middlewares/authMiddleware.js";
import {
  changeMachinePlanning,
  exportPdfPlanning,
  getOrderAccept,
  getPlanningByCustomerName,
  getPlanningByFlute,
  getPlanningByGhepKho,
  getPlanningByMachine,
  getPlanningByOrderId,
  pauseOrAcceptLackQtyPLanning,
  planningOrder,
  updateIndex_TimeRunning,
} from "../../controller/user/planning/planningController.js";
import { authorizeAnyPermission } from "../../middlewares/permissionMiddleware.js";

const router = Router();

//waiting for planning
router.get("/", authenticate, authorizeAnyPermission(["plan"]), getOrderAccept);
router.post(
  "/planningOrder",
  authenticate,
  authorizeAnyPermission(["plan"]),
  planningOrder
);

//production queue
router.get(
  "/byMachine",
  authenticate,
  authorizeAnyPermission(["plan"]),
  getPlanningByMachine
);
router.post(
  "/updateIndex_TimeRunning",
  authenticate,
  authorizeAnyPermission(["plan"]),
  updateIndex_TimeRunning
);
router.put(
  "/changeMachine",
  authenticate,
  authorizeAnyPermission(["plan"]),
  changeMachinePlanning
);
router.put(
  "/pauseOrAcceptLackQty",
  authenticate,
  authorizeAnyPermission(["plan"]),
  pauseOrAcceptLackQtyPLanning
);

//get properties of planning
router.get(
  "/getByCustomerName",
  authenticate,
  authorizeAnyPermission(["plan"]),
  getPlanningByCustomerName
);
router.get(
  "/getByFlute",
  authenticate,
  authorizeAnyPermission(["plan"]),
  getPlanningByFlute
);
router.get(
  "/getByGhepKho",
  authenticate,
  authorizeAnyPermission(["plan"]),
  getPlanningByGhepKho
);
router.get(
  "/getByOrderId",
  authenticate,
  authorizeAnyPermission(["plan"]),
  getPlanningByOrderId
);

//export file pdf
router.get(
  "/exportPdf",
  authenticate,
  authorizeAnyPermission(["plan"]),
  exportPdfPlanning
);

export default router;
