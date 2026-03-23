"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const orderController_1 = require("../../controller/user/order/orderController");
const authMiddleware_1 = __importDefault(require("../../middlewares/authMiddleware"));
const permissionMiddleware_1 = require("../../middlewares/permissionMiddleware");
const uploadImage_1 = __importDefault(require("../../utils/image/uploadImage"));
const router = (0, express_1.default)();
//===============================ACCEPT AND PLANNING=====================================
router.get("/accept-planning", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["sale"]), orderController_1.getOrdersAcceptPlanning);
//===============================PENDING AND REJECT=====================================
router.get("/pending-reject", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["sale"]), orderController_1.getOrderPendingAndReject);
router.post("/", authMiddleware_1.default, uploadImage_1.default.single("orderImage"), (0, permissionMiddleware_1.authorizeAnyPermission)(["sale"]), orderController_1.addOrder);
router.put("/", authMiddleware_1.default, uploadImage_1.default.single("orderImage"), (0, permissionMiddleware_1.authorizeAnyPermission)(["sale"]), orderController_1.updateOrder);
router.delete("/", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["sale"]), orderController_1.deleteOrder);
//===============================ORDER AUTOCOMPLETE=====================================
router.get("/order-id-raw", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["sale"]), orderController_1.getOrderIdRaw);
router.get("/order-detail", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["sale"]), orderController_1.getOrderDetail);
//===============================CLOUDINARY IMAGE=====================================
router.get("/get-signature", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["sale"]), orderController_1.getCloudinarySignature);
exports.default = router;
//# sourceMappingURL=orderRoutes.js.map