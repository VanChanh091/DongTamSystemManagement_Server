import { Router } from "express";
import authenticate from "../../middlewares/authMiddleware";
import {
  getPlanningWaitingCheck,
  getInboundHistory,
} from "../../controller/user/warehouse/inboundHistoryController";
import {
  createOutbound,
  deleteOutbound,
  exportFileOutbound,
  getOutboundDetail,
  getOutboundHistory,
  outboundAutoComplete,
  updateOutbound,
} from "../../controller/user/warehouse/outboundHistoryController";
import {
  createNewInventory,
  exportInventory,
  getAllInventory,
} from "../../controller/user/warehouse/inventoryController";
import { authorizeAnyPermission } from "../../middlewares/permissionMiddleware";

const router = Router();

//=====================CHECK AND INBOUND QTY========================

router.get("/waiting-check", authenticate, getPlanningWaitingCheck);

//========================INBOUND HISTORY===========================

router.get("/inbound", authenticate, getInboundHistory);

//========================OUTBOUND HISTORY===========================

router.get("/outbound", authenticate, getOutboundHistory);
router.get("/outbound/detail", authenticate, getOutboundDetail);
router.post("/outbound/export", authenticate, exportFileOutbound);
router.post("/outbound", authorizeAnyPermission(["delivery"]), authenticate, createOutbound);
router.put("/outbound", authorizeAnyPermission(["delivery"]), authenticate, updateOutbound);
router.delete("/outbound", authorizeAnyPermission(["delivery"]), authenticate, deleteOutbound);

//auto complete dialog
router.get("/outbound/get-search", authenticate, outboundAutoComplete);

//========================INVENTORY===========================
router.get("/inventory", authenticate, getAllInventory);
router.post("/inventory", authenticate, createNewInventory);
router.post("/inventory/export", authenticate, authorizeAnyPermission(["plan"]), exportInventory);

//========================TEST CRASH===========================
router.get("/test-crash", (req, res) => {
  throw new Error("Test lỗi 500 để bắn Telegram nè! 💣");
});

export default router;
