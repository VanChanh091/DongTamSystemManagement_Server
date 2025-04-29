import { Router } from "express";
import authenticate from "../middlewares/authMiddleware.js";
import { updateStatus } from "../controller/admin/orderAdmin.js";

const router = Router();

router.put("/updateStatus", authenticate, updateStatus);

export default router;
