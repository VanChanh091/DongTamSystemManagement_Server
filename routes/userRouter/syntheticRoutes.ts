import { Router } from "express";
import authenticate from "../../middlewares/authMiddleware";
import {
  exportExcelSyntheticPlanning,
  getSyntheticPlanning,
} from "../../controller/user/synthetic/synthetic.planningController";
import {
  completeOrder,
  exportExcelOrders,
  getAllSyntheticOrders,
} from "../../controller/user/synthetic/synthetic.orderController";
import { authorizeAnyPermission } from "../../middlewares/permissionMiddleware";
import {
  getErrorProductionReport,
  getRevenueReport,
} from "../../controller/user/synthetic/synthetic.statisticController";

const router = Router();

//==========================ORDERS==========================
router.get("/orders", authenticate, getAllSyntheticOrders);
router.post(
  "/orders/export",
  authenticate,
  authorizeAnyPermission(["accountant"]),
  exportExcelOrders,
);
router.put("/orders", authenticate, completeOrder);

//=========================PLANNING=========================
router.get("/planning", authenticate, getSyntheticPlanning);
router.post("/planning/export", authenticate, exportExcelSyntheticPlanning);

//=========================STATISTIC REPORT=========================
router.get("/report-revenue", authenticate, getRevenueReport);
router.get("/report-err-production", authenticate, getErrorProductionReport);

export default router;
