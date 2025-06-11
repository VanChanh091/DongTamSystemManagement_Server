import { Router } from "express";
import authenticate from "../../middlewares/authMiddleware.js";
import {
  changeMachinePlanning,
  getOrderAccept,
  getOrderPlanning,
  getPlanningByMachine,
  planningOrder,
} from "../../controller/user/planning/planningController.js";

const router = Router();

router.get("/", authenticate, getOrderAccept);
router.get("/planning", authenticate, getOrderPlanning);
router.get("/byMachine", authenticate, getPlanningByMachine);
router.post("/planningOrder", authenticate, planningOrder);
router.put("/changeMachine", authenticate, changeMachinePlanning);

export default router;
