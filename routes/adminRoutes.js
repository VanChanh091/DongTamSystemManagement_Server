import { Router } from "express";
import authenticate from "../middlewares/authMiddleware.js";
import {
  getOrderPending,
  updateStatusAdmin,
} from "../controller/admin/adminOrder.js";

const router = Router();

router.get("/", authenticate, getOrderPending);
router.put("/updateStatus", authenticate, updateStatusAdmin);

export default router;
