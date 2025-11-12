"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const orderController_1 = require("../../controller/user/order/orderController");
const authMiddleware_1 = __importDefault(require("../../middlewares/authMiddleware"));
const permissionMiddleware_1 = require("../../middlewares/permissionMiddleware");
const router = (0, express_1.default)();
router.get("/pending-reject", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["sale"]), orderController_1.getOrderPendingAndReject);
router.get("/accept-planning", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["sale"]), orderController_1.getOrderAcceptAndPlanning);
router.get("/filter", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["sale"]), orderController_1.getOrderByField);
router.post("/", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["sale"]), orderController_1.addOrder);
router.put("/orders", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["sale"]), orderController_1.updateOrder);
router.delete("/orders", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["sale"]), orderController_1.deleteOrder);
exports.default = router;
//# sourceMappingURL=orderRoutes.js.map