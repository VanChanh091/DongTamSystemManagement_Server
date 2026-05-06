import { Router } from "express";
import authenticate from "../../middlewares/authMiddleware";
import {
  exportExcelSyntheticPlanning,
  getSyntheticPlanning,
} from "../../controller/user/synthetic/synthetic.planningController";
import {
  exportExcelOrders,
  getAllSyntheticOrders,
} from "../../controller/user/synthetic/synthetic.orderController";
import { authorizeAnyPermission } from "../../middlewares/permissionMiddleware";

const router = Router();

//==========================ORDERS==========================
router.get("/orders", authenticate, getAllSyntheticOrders);
router.post(
  "/orders/export",
  authenticate,
  authorizeAnyPermission(["accountant"]),
  exportExcelOrders,
);

//=========================PLANNING=========================
router.get("/planning", authenticate, getSyntheticPlanning);
router.post("/planning/export", authenticate, exportExcelSyntheticPlanning);

export default router;
