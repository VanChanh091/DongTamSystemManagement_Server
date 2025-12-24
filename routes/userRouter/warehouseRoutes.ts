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
  getAllOutboundHistory,
  getOrderInboundQty,
  getOutboundDetail,
  searchOrderIds,
  searchOutboundByField,
} from "../../controller/user/warehouse/outboundHistoryController";
import {
  createNewInventory,
  getAllInventory,
} from "../../controller/user/warehouse/inventoryController";

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
router.post("/createOutbound", authenticate, createOutbound);
// router.get("/updateOutbound", authenticate, createOutbound);
// router.get("/deleteOutbound", authenticate, createOutbound);
router.get("/outbound/filter", authenticate, searchOutboundByField);

router.get("/searchOrderIds", authenticate, searchOrderIds);
router.get("/getOrderInboundQty", authenticate, getOrderInboundQty);

//========================INVENTORY===========================
router.get("/getAllInventory", authenticate, getAllInventory);
router.post("/createInventory", authenticate, createNewInventory);

export default router;
