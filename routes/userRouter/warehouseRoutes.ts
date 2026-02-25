import { Router } from "express";
import authenticate from "../../middlewares/authMiddleware";
import {
  getAllInboundHistory,
  getBoxCheckedDetail,
  getBoxWaitingChecked,
  getPaperWaitingChecked,
  searchInboundByField,
} from "../../controller/user/warehouse/inboundHistoryController";
import {
  createOutbound,
  deleteOutbound,
  exportFileOutbound,
  getAllOutboundHistory,
  getOrderInboundQty,
  getOutboundDetail,
  searchOrderIds,
  searchOutboundByField,
  updateOutbound,
} from "../../controller/user/warehouse/outboundHistoryController";
import {
  createNewInventory,
  getAllInventory,
} from "../../controller/user/warehouse/inventoryController";
import { authorizeAnyPermission } from "../../middlewares/permissionMiddleware";

const router = Router();

//=====================CHECK AND INBOUND QTY========================

router.get("/getPaperWaiting", authenticate, getPaperWaitingChecked);
router.get("/getBoxWaiting", authenticate, getBoxWaitingChecked);
router.get("/getBoxDetail", authenticate, getBoxCheckedDetail);

//========================INBOUND HISTORY===========================

router.get("/inbound", authenticate, getAllInboundHistory);
router.get("/inbound/filter", authenticate, searchInboundByField);

//========================OUTBOUND HISTORY===========================

router.get("/outbound", authenticate, getAllOutboundHistory);
router.get("/outbound/detail", authenticate, getOutboundDetail);
router.get("/outbound/filter", authenticate, searchOutboundByField);
router.post("/outbound/exportFile", authenticate, exportFileOutbound);
router.post(
  "/outbound/createOutbound",
  authorizeAnyPermission(["delivery"]),
  authenticate,
  createOutbound,
);
router.put(
  "/outbound/updateOutbound",
  authorizeAnyPermission(["delivery"]),
  authenticate,
  updateOutbound,
);
router.delete(
  "/outbound/deleteOutbound",
  authorizeAnyPermission(["delivery"]),
  authenticate,
  deleteOutbound,
);

//auto complete dialog
router.get("/outbound/searchOrderIds", authenticate, searchOrderIds);
router.get("/outbound/getInboundQty", authenticate, getOrderInboundQty);

//========================INVENTORY===========================
router.get("/getAllInventory", authenticate, getAllInventory);
router.post("/createInventory", authenticate, createNewInventory);

router.get("/testCrash", (req, res) => {
  throw new Error("Test lỗi 500 để bắn Telegram nè! 💣");
});

export default router;
