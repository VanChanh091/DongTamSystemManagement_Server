"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const customerController_1 = require("../../controller/user/customer/customerController");
const authMiddleware_1 = __importDefault(require("../../middlewares/authMiddleware"));
const permissionMiddleware_1 = require("../../middlewares/permissionMiddleware");
const router = (0, express_1.default)();
router.get("/", authMiddleware_1.default, customerController_1.getAllCustomer);
router.get("/filter", authMiddleware_1.default, customerController_1.getCustomerByField);
router.get("/orderCount", authMiddleware_1.default, customerController_1.checkCustomerInOrders);
router.post("/exportExcel", authMiddleware_1.default, customerController_1.exportExcelCustomer);
router.post("/", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["sale"]), customerController_1.createCustomer);
router.put("/customerUp", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["sale"]), customerController_1.updateCustomer);
router.delete("/customerDel", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["sale"]), customerController_1.deleteCustomer);
exports.default = router;
//# sourceMappingURL=customerRoutes.js.map