"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeDeliveryAccess = void 0;
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = __importDefault(require("../../middlewares/authMiddleware"));
const permissionMiddleware_1 = require("../../middlewares/permissionMiddleware");
const deliveryController_1 = require("../../controller/user/delivery/deliveryController");
const router = (0, express_1.default)();
const DELIVERY_POLICIES = {
    estimate: { departments: ["Operation", "Sale"], permissions: ["plan", "sale"] },
    request: { departments: ["Operation"], permissions: ["plan"] },
    schedule: { departments: ["Operation", "Delivery"], permissions: ["plan", "delivery"] },
    prepare: { departments: ["Delivery"], permissions: ["delivery"] },
};
const authorizeDeliveryAccess = (scope) => {
    const policy = DELIVERY_POLICIES[scope];
    return (0, permissionMiddleware_1.authorizeAccess)({
        departments: policy.departments,
        permissions: policy.permissions,
        requireDept: true,
    });
};
exports.authorizeDeliveryAccess = authorizeDeliveryAccess;
//===============================PLANNING ESTIMATE TIME==================================
router.get("/estimate", authMiddleware_1.default, (0, exports.authorizeDeliveryAccess)("estimate"), deliveryController_1.getPlanningEstimateTime);
router.put("/estimate", authMiddleware_1.default, (0, exports.authorizeDeliveryAccess)("estimate"), deliveryController_1.handlePutDelivery);
//=================================DELIVERY REQUEST=====================================
router.get("/planning", authMiddleware_1.default, deliveryController_1.getPlanningRequest);
router.post("/planning", authMiddleware_1.default, (0, exports.authorizeDeliveryAccess)("request"), deliveryController_1.handlePostDeliveryRequest);
router.put("/planning", authMiddleware_1.default, (0, exports.authorizeDeliveryAccess)("request"), deliveryController_1.implementDeliveryPlan);
//=================================SCHEDULE DELIVERY=====================================
router.get("/schedule", authMiddleware_1.default, deliveryController_1.getAllScheduleDelivery);
router.get("/schedule/get-search", authMiddleware_1.default, deliveryController_1.getDeliveryItemsByOrderId);
router.put("/schedule", authMiddleware_1.default, (0, exports.authorizeDeliveryAccess)("schedule"), deliveryController_1.cancelOrCompleteDeliveryPlan);
router.post("/schedule/export", authMiddleware_1.default, (0, exports.authorizeDeliveryAccess)("schedule"), deliveryController_1.exportScheduleDelivery);
//=================================PREPARE GOODS=====================================
router.get("/prepare", authMiddleware_1.default, deliveryController_1.getRequestPrepareGoods);
router.put("/prepare", authMiddleware_1.default, (0, exports.authorizeDeliveryAccess)("prepare"), deliveryController_1.handleUpdatePreparedGoods);
//socket
router.post("/notify-delivery", authMiddleware_1.default, (0, exports.authorizeDeliveryAccess)("prepare"), deliveryController_1.notifyPrepareGoods);
exports.default = router;
//# sourceMappingURL=deliveryRoutes.js.map