import { Router } from "express";
import authenticate from "../../middlewares/authMiddleware.js";
import {
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

export default router;
