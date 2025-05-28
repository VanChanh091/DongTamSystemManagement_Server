import { Router } from "express";
import authenticate from "../../middlewares/authMiddleware.js";
import {
  getOrderAccept,
  planningOrder,
} from "../../controller/user/planning/planningController.js";

const router = Router();

router.get("/", authenticate, getOrderAccept);
router.post("/planningOrder", authenticate, planningOrder);

export default router;
