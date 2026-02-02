"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = __importDefault(require("../../middlewares/authMiddleware"));
const permissionMiddleware_1 = require("../../middlewares/permissionMiddleware");
const deliveryController_1 = require("../../controller/user/delivery/deliveryController");
const router = (0, express_1.default)();
//===============================PLANNING ESTIMATE TIME==================================
router.get("/getPlanningEstimate", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["plan", "sale"]), deliveryController_1.getPlanningEstimateTime);
router.put("/confirmReadyDelivery", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["plan", "sale"]), deliveryController_1.confirmReadyDeliveryPlanning);
//=================================PLANNING DELIVERY=====================================
router.get("/getPlanningPending", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["plan"]), deliveryController_1.getPlanningPendingDelivery);
router.get("/getDeliveryPlanDetail", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["plan"]), deliveryController_1.getDeliveryPlanDetailForEdit);
router.post("/createDeliveryPlan", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["plan"]), deliveryController_1.createDeliveryPlan);
router.put("/confirmDelivery", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["plan"]), deliveryController_1.confirmForDeliveryPlanning);
//=================================SCHEDULE DELIVERY=====================================
router.get("/getScheduleDelivery", authMiddleware_1.default, deliveryController_1.getAllScheduleDelivery);
router.put("/updateStatusDelivery", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["plan", "delivery"]), deliveryController_1.cancelOrCompleteDeliveryPlan);
router.post("/exportExcel", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["plan", "delivery"]), deliveryController_1.exportScheduleDelivery);
exports.default = router;
//# sourceMappingURL=deliveryRoutes.js.map