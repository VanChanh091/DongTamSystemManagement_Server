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

const router = Router();

//waiting for planning
router.get("/", authenticate, getOrderAccept);
router.post("/planningOrder", authenticate, planningOrder);

//production queue
router.get("/byMachine", authenticate, getPlanningByMachine);
router.put("/changeMachine", authenticate, changeMachinePlanning);
router.post("/updateIndex_TimeRunning", authenticate, updateIndex_TimeRunning);
router.put("/pauseOrAcceptLackQty", authenticate, pauseOrAcceptLackQtyPLanning);

//get properties of planning
router.get("/getByCustomerName", authenticate, getPlanningByCustomerName);
router.get("/getByFlute", authenticate, getPlanningByFlute);
router.get("/getByGhepKho", authenticate, getPlanningByGhepKho);
router.get("/getByOrderId", authenticate, getPlanningByOrderId);

//export file pdf
router.get("/exportPdf", authenticate, exportPdfPlanning);

export default router;
