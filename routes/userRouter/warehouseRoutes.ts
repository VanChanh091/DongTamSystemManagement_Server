import { Router } from "express";
import authenticate from "../../middlewares/authMiddleware";
import {
  getPlanningWaitingCheck,
  getInboundHistory,
  exportExcelInbounds,
} from "../../controller/user/warehouse/inboundHistoryController";
import {
  deleteOutbound,
  exportFilePDFOutbound,
  exportOutboundDetail,
  getOutboundDetail,
  getOutboundHistory,
  handleAddOrUpdateOutbound,
  outboundAutoComplete,
} from "../../controller/user/warehouse/outboundHistoryController";
import {
  createNewInventory,
  exportInventory,
  getAllInventory,
  getAllLiquidationInventory,
} from "../../controller/user/warehouse/inventoryController";
import { authorizeAnyPermission } from "../../middlewares/permissionMiddleware";

const router = Router();

//=====================CHECK AND INBOUND QTY========================

router.get("/waiting-check", authenticate, getPlanningWaitingCheck);

//========================INBOUND HISTORY===========================

router.get("/inbound", authenticate, getInboundHistory);
router.post("/inbound/export", authenticate, exportExcelInbounds);

//========================OUTBOUND HISTORY===========================

router.get("/outbound", authenticate, getOutboundHistory);
router.get("/outbound/detail", authenticate, getOutboundDetail);
router.post(
  "/outbound",
  authorizeAnyPermission(["delivery", "accountant"]),
  authenticate,
  handleAddOrUpdateOutbound,
);
router.put(
  "/outbound",
  authorizeAnyPermission(["delivery", "accountant"]),
  authenticate,
  handleAddOrUpdateOutbound,
);
router.delete(
  "/outbound",
  authorizeAnyPermission(["delivery", "accountant"]),
  authenticate,
  deleteOutbound,
);

//auto complete dialog
router.get("/outbound/get-search", authenticate, outboundAutoComplete);

//export file
router.post("/outbound/export", authenticate, exportFilePDFOutbound);
router.post(
  "/outbound/export-detail",
  authenticate,
  authorizeAnyPermission(["accountant"]),
  exportOutboundDetail,
);

//========================INVENTORY & LIQUIDATION===========================
router.get("/inventory", authenticate, getAllInventory);
router.post("/inventory", authenticate, createNewInventory);
router.post("/inventory/export", authenticate, authorizeAnyPermission(["plan"]), exportInventory);

router.get("/liquidation", authenticate, getAllLiquidationInventory);

//========================TEST CRASH===========================
router.get("/test-crash", (req, res) => {
  throw new Error("Test lỗi 500 để bắn Telegram nè! 💣");
});

export default router;
