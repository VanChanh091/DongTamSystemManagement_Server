"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = __importDefault(require("../../middlewares/authMiddleware"));
const permissionMiddleware_1 = require("../../middlewares/permissionMiddleware");
const badgeController_1 = require("../../controller/badge/badgeController");
const router = (0, express_1.default)();
const authorizePlanningAccess = () => (0, permissionMiddleware_1.authorizeAccess)({ departments: ["Operation"], permissions: ["plan"], requireDept: true });
//pending order
router.get("/count-pending", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAccess)({ departments: ["Sale"], permissions: ["manager"], requireDept: true }), badgeController_1.countOrderPending);
//order pending planning
router.get("/count-pending-planning", authMiddleware_1.default, authorizePlanningAccess(), badgeController_1.countOrderPendingPlanning);
//planning stop
router.get("/count-planning-stop", authMiddleware_1.default, authorizePlanningAccess(), badgeController_1.countPlanningStop);
//waiting check paper & box
router.get("/count-waiting-check", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAccess)({ departments: ["QC"], permissions: ["QC"], requireDept: true }), badgeController_1.countWaitingCheck);
//delivery request
router.get("/count-delivery-request", authMiddleware_1.default, authorizePlanningAccess(), badgeController_1.countDeliveryRequest);
//prepare goods
router.get("/count-prepare-goods", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAccess)({ departments: ["Delivery"], permissions: ["delivery"], requireDept: true }), badgeController_1.countRequestPrepareGoods);
//debt deduction
router.get("/count-debt-deduction", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAccess)({ departments: ["Accountant"], permissions: ["accountant"], requireDept: true }), badgeController_1.countDebtDeduction);
exports.default = router;
//# sourceMappingURL=badgeRoutes.js.map