import { Router } from "express";
import authenticate from "../../middlewares/authMiddleware.js";
import {
  changeMachinePlanning,
  exportPdfPlanning,
  getOrderAccept,
  getOrderPlanning,
  getPlanningByCustomerName,
  getPlanningByFlute,
  getPlanningByGhepKho,
  getPlanningByMachine,
  planningOrder,
  updateIndexPlanning,
} from "../../controller/user/planning/planningController.js";

const router = Router();

router.get("/", authenticate, getOrderAccept);
router.get("/planning", authenticate, getOrderPlanning);
router.get("/byMachine", authenticate, getPlanningByMachine);
router.post("/planningOrder", authenticate, planningOrder);
router.put("/changeMachine", authenticate, changeMachinePlanning);
router.put("/updateIndex", authenticate, updateIndexPlanning);

//get properties of planning
router.get("/getByCustomerName", authenticate, getPlanningByCustomerName);
router.get("/getByFlute", authenticate, getPlanningByFlute);
router.get("/getByGhepKho", authenticate, getPlanningByGhepKho);

//export file pdf
router.get("/exportPdf", authenticate, exportPdfPlanning);

export default router;
