import { Router } from "express";
import authenticate from "../../middlewares/authMiddleware.js";
import {
  getOrderAccept,
  updateStatusPlanning,
} from "../../controller/user/planning/planning.js";

const router = Router();

router.get("/", authenticate, getOrderAccept);
router.get("/updateStatus", authenticate, updateStatusPlanning);

export default router;
