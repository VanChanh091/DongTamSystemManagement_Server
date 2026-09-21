"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = __importDefault(require("../../middlewares/authMiddleware"));
const synthetic_planningController_1 = require("../../controller/user/synthetic/synthetic.planningController");
const synthetic_orderController_1 = require("../../controller/user/synthetic/synthetic.orderController");
const permissionMiddleware_1 = require("../../middlewares/permissionMiddleware");
const synthetic_statisticController_1 = require("../../controller/user/synthetic/synthetic.statisticController");
const router = (0, express_1.Router)();
//==========================ORDERS==========================
router.get("/orders", authMiddleware_1.default, synthetic_orderController_1.getAllSyntheticOrders);
router.post("/orders/export", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["accountant"]), synthetic_orderController_1.exportExcelOrders);
router.put("/orders", authMiddleware_1.default, synthetic_orderController_1.completeOrder);
//=========================PLANNING=========================
router.get("/planning", authMiddleware_1.default, synthetic_planningController_1.getSyntheticPlanning);
router.post("/planning/export", authMiddleware_1.default, synthetic_planningController_1.exportExcelSyntheticPlanning);
//=========================STATISTIC REPORT=========================
router.get("/report-revenue", authMiddleware_1.default, synthetic_statisticController_1.getRevenueReport);
router.get("/report-err-production", authMiddleware_1.default, synthetic_statisticController_1.getErrorProductionReport);
exports.default = router;
//# sourceMappingURL=syntheticRoutes.js.map