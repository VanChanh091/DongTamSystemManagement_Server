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
router.get("/waiting-check", authMiddleware_1.default, inboundHistoryController_1.getPlanningWaitingCheck);
//========================INBOUND HISTORY===========================
router.get("/inbound", authMiddleware_1.default, inboundHistoryController_1.getInboundHistory);
//========================OUTBOUND HISTORY===========================
router.get("/outbound", authMiddleware_1.default, outboundHistoryController_1.getOutboundHistory);
router.get("/outbound/detail", authMiddleware_1.default, outboundHistoryController_1.getOutboundDetail);
router.post("/outbound/export", authMiddleware_1.default, outboundHistoryController_1.exportFileOutbound);
router.post("/outbound", (0, permissionMiddleware_1.authorizeAnyPermission)(["delivery"]), authMiddleware_1.default, outboundHistoryController_1.createOutbound);
router.put("/outbound", (0, permissionMiddleware_1.authorizeAnyPermission)(["delivery"]), authMiddleware_1.default, outboundHistoryController_1.updateOutbound);
router.delete("/outbound", (0, permissionMiddleware_1.authorizeAnyPermission)(["delivery"]), authMiddleware_1.default, outboundHistoryController_1.deleteOutbound);
//auto complete dialog
router.get("/outbound/get-search", authMiddleware_1.default, outboundHistoryController_1.outboundAutoComplete);
//========================INVENTORY & LIQUIDATION===========================
router.get("/inventory", authMiddleware_1.default, inventoryController_1.getAllInventory);
router.post("/inventory", authMiddleware_1.default, inventoryController_1.createNewInventory);
router.post("/inventory/export", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["plan"]), inventoryController_1.exportInventory);
router.get("/liquidation", authMiddleware_1.default, inventoryController_1.getAllLiquidationInventory);
//========================TEST CRASH===========================
router.get("/test-crash", (req, res) => {
    throw new Error("Test lỗi 500 để bắn Telegram nè! 💣");
});
exports.default = router;
//# sourceMappingURL=warehouseRoutes.js.map