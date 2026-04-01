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
router.get("/estimate", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["plan", "sale"]), deliveryController_1.getPlanningEstimateTime);
router.put("/estimate", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["plan", "sale"]), deliveryController_1.registerQtyDelivery);
//=================================DELIVERY PLANNING=====================================
// router.get("/planning", authenticate, authorizeAnyPermission(["plan"]), getPendingDelivery);
router.get("/planning", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["plan"]), deliveryController_1.getPlanningRequest);
router.post("/planning", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["plan"]), deliveryController_1.createDeliveryPlan);
router.put("/planning", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["plan"]), deliveryController_1.confirmForDeliveryPlanning);
//=================================SCHEDULE DELIVERY=====================================
router.get("/schedule", authMiddleware_1.default, deliveryController_1.getAllScheduleDelivery);
router.put("/schedule", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["plan", "delivery"]), deliveryController_1.cancelOrCompleteDeliveryPlan);
router.post("/schedule/export", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["plan", "delivery"]), deliveryController_1.exportScheduleDelivery);
//=================================PREPARE GOODS=====================================
router.get("/prepare", authMiddleware_1.default, deliveryController_1.getRequestPrepareGoods);
router.put("/prepare", authMiddleware_1.default, deliveryController_1.requestOrPrepareGoods);
//socket
router.post("/notify-delivery", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["delivery"]), deliveryController_1.notifyPrepareGoods);
exports.default = router;
//# sourceMappingURL=deliveryRoutes.js.map