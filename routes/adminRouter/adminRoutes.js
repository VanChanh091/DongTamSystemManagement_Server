import { Router } from "express";
import authenticate from "../../middlewares/authMiddleware.js";
import {
  getOrderPending,
  updateStatusAdmin,
} from "../../controller/admin/adminOrderController.js";
import {
  addPaperFactor,
  deletePaperFactor,
  getAllPaperFactors,
  updatePaperFactor,
} from "../../controller/admin/adminPaperFactorController.js";

const router = Router();

// Admin routes for managing orders
router.get("/", authenticate, getOrderPending);
router.put("/updateStatus", authenticate, updateStatusAdmin);

//admin routes for managing paper factors
router.get("/getAllPF", authenticate, getAllPaperFactors);
router.post("/addPF", authenticate, addPaperFactor);
router.put("/updatePF", authenticate, updatePaperFactor);
router.delete("/deletePF", authenticate, deletePaperFactor);

export default router;
