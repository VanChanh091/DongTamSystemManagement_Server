"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = __importDefault(require("../../middlewares/authMiddleware"));
const inboundHistoryController_1 = require("../../controller/user/warehouse/inboundHistoryController");
const outboundHistoryController_1 = require("../../controller/user/warehouse/outboundHistoryController");
const inventoryController_1 = require("../../controller/user/warehouse/inventoryController");
const permissionMiddleware_1 = require("../../middlewares/permissionMiddleware");
const router = (0, express_1.Router)();
//=====================CHECK AND INBOUND QTY========================
router.get("/getPaperWaiting", authMiddleware_1.default, inboundHistoryController_1.getPaperWaitingChecked);
router.get("/getBoxWaiting", authMiddleware_1.default, inboundHistoryController_1.getBoxWaitingChecked);
router.get("/getBoxDetail", authMiddleware_1.default, inboundHistoryController_1.getBoxCheckedDetail);
//========================INBOUND HISTORY===========================
router.get("/inbound", authMiddleware_1.default, inboundHistoryController_1.getAllInboundHistory);
router.get("/inbound/filter", authMiddleware_1.default, inboundHistoryController_1.searchInboundByField);
//========================OUTBOUND HISTORY===========================
router.get("/outbound", authMiddleware_1.default, outboundHistoryController_1.getAllOutboundHistory);
router.get("/outbound/detail", authMiddleware_1.default, outboundHistoryController_1.getOutboundDetail);
router.get("/outbound/filter", authMiddleware_1.default, outboundHistoryController_1.searchOutboundByField);
router.post("/outbound/exportFile", authMiddleware_1.default, outboundHistoryController_1.exportFileOutbound);
router.post("/outbound/createOutbound", (0, permissionMiddleware_1.authorizeAnyPermission)(["delivery"]), authMiddleware_1.default, outboundHistoryController_1.createOutbound);
router.put("/outbound/updateOutbound", (0, permissionMiddleware_1.authorizeAnyPermission)(["delivery"]), authMiddleware_1.default, outboundHistoryController_1.updateOutbound);
router.delete("/outbound/deleteOutbound", (0, permissionMiddleware_1.authorizeAnyPermission)(["delivery"]), authMiddleware_1.default, outboundHistoryController_1.deleteOutbound);
//auto complete dialog
router.get("/outbound/searchOrderIds", authMiddleware_1.default, outboundHistoryController_1.searchOrderIds);
router.get("/outbound/getInboundQty", authMiddleware_1.default, outboundHistoryController_1.getOrderInboundQty);
//========================INVENTORY===========================
router.get("/getAllInventory", authMiddleware_1.default, inventoryController_1.getAllInventory);
router.post("/createInventory", authMiddleware_1.default, inventoryController_1.createNewInventory);
exports.default = router;
//# sourceMappingURL=warehouseRoutes.js.map