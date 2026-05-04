import { Router } from "express";
import authenticate from "../../middlewares/authMiddleware";
import {
  exportExcelSyntheticPlanning,
  getSyntheticPlanning,
} from "../../controller/user/synthetic/synthetic.planningController";
import { getAllSyntheticOrders } from "../../controller/user/synthetic/synthetic.orderController";

const router = Router();

//==========================ORDERS==========================
router.get("/orders", authenticate, getAllSyntheticOrders);

//=========================PLANNING=========================
router.get("/planning", authenticate, getSyntheticPlanning);
router.post("/planning/export", authenticate, exportExcelSyntheticPlanning);

export default router;
