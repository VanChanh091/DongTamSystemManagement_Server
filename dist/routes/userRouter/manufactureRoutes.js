"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = __importDefault(require("../../middlewares/authMiddleware"));
const manufactureController_1 = require("../../controller/user/manufacture/manufactureController");
const permissionMiddleware_1 = require("../../middlewares/permissionMiddleware");
const router = (0, express_1.Router)();
//=========================PAPER=========================
router.get("/paper", authMiddleware_1.default, manufactureController_1.getPlanningPaper);
router.post("/paper", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["machine1350", "machine1900", "machine2Layer", "MachineRollPaper"]), manufactureController_1.addReportPaper);
router.post("/paper/confirm", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["machine1350", "machine1900", "machine2Layer", "MachineRollPaper"]), manufactureController_1.confirmProducingPaper);
router.put("/paper", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["machine1350", "machine1900", "machine2Layer", "MachineRollPaper"]), manufactureController_1.updateReportPaper);
//=========================BOX=========================
router.get("/box", authMiddleware_1.default, manufactureController_1.getPlanningBox);
router.post("/box", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["step2Production"]), manufactureController_1.addReportBox);
router.post("/box/confirm", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["step2Production"]), manufactureController_1.confirmProducingBox);
router.put("/box", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["step2Production"]), manufactureController_1.updateReportBox);
router.put("/box/request", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["step2Production"]), manufactureController_1.updateRequestStockCheck);
exports.default = router;
//# sourceMappingURL=manufactureRoutes.js.map