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
  pauseOrAcceptLackQtyPLanning,
  planningOrder,
  updateIndexPlanning,
} from "../../controller/user/planning/planningController.js";

const router = Router();

router.get("/", authenticate, getOrderAccept);
router.post("/planningOrder", authenticate, planningOrder);

router.get("/byMachine", authenticate, getPlanningByMachine);
router.put("/changeMachine", authenticate, changeMachinePlanning);
router.put("/updateIndex", authenticate, updateIndexPlanning);
router.put("/pauseOrAcceptLackQty", authenticate, pauseOrAcceptLackQtyPLanning);

//get properties of planning
router.get("/getByCustomerName", authenticate, getPlanningByCustomerName);
router.get("/getByFlute", authenticate, getPlanningByFlute);
router.get("/getByGhepKho", authenticate, getPlanningByGhepKho);

//export file pdf
router.get("/exportPdf", authenticate, exportPdfPlanning);

export default router;
