import { Router } from "express";
import authenticate from "../../middlewares/authMiddleware";
import {
  getAllInboundHistory,
  getBoxCheckedDetail,
  getBoxWaitingChecked,
  getPaperWaitingChecked,
  inboundQtyBox,
  inboundQtyPaper,
  searchInboundByField,
} from "../../controller/user/warehouse/inboundHistoryController";
import { authorizeAnyPermission } from "../../middlewares/permissionMiddleware";
import {
  getAllOutboundHistory,
  searchOutboundByField,
} from "../../controller/user/warehouse/outboundHistoryController";

const router = Router();

//=====================CHECK AND INBOUND QTY========================

router.get("/getPaperWaiting", authenticate, getPaperWaitingChecked);
router.get("/getBoxWaiting", authenticate, getBoxWaitingChecked);
router.get("/getBoxDetail", authenticate, getBoxCheckedDetail);

router.post("/inboundPaper", authenticate, authorizeAnyPermission(["QC"]), inboundQtyPaper);
router.post("/inboundBox", authenticate, authorizeAnyPermission(["QC"]), inboundQtyBox);

//========================INBOUND HISTORY===========================

router.get("/inbound", authenticate, getAllInboundHistory);
router.get("/inbound/filter", authenticate, searchInboundByField);

//========================OUTBOUND HISTORY===========================

router.get("/outbound", authenticate, getAllOutboundHistory);
router.get("/outbound/filter", authenticate, searchOutboundByField);

export default router;
