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
//pending order
router.get("/count-pending", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["admin"]), badgeController_1.countOrderPending);
//order reject
router.get("/count-rejected", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["sale"]), badgeController_1.countOrderRejected);
//order pending planning
router.get("/count-pending-planning", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["plan"]), badgeController_1.countOrderPendingPlanning);
//planning stop
router.get("/count-planning-stop", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["plan"]), badgeController_1.countPlanningStop);
//waiting check paper & box
router.get("/count-waiting-check", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["QC"]), badgeController_1.countWaitingCheck);
exports.default = router;
//# sourceMappingURL=badgeRoutes.js.map