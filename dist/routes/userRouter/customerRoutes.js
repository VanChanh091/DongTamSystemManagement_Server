"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const customerController_1 = require("../../controller/user/customer/customerController");
const authMiddleware_1 = __importDefault(require("../../middlewares/authMiddleware"));
const orderRoutes_1 = require("./orderRoutes");
const router = (0, express_1.default)();
router.get("/", authMiddleware_1.default, customerController_1.getCustomers);
router.get("/order-count", authMiddleware_1.default, customerController_1.checkCustomerInOrders);
router.get("/user-sales", authMiddleware_1.default, customerController_1.getUserSales);
router.post("/", authMiddleware_1.default, (0, orderRoutes_1.authorizeSaleAccess)(), customerController_1.createCustomer);
router.put("/", authMiddleware_1.default, (0, orderRoutes_1.authorizeSaleAccess)(), customerController_1.updateCustomer);
router.delete("/", authMiddleware_1.default, (0, orderRoutes_1.authorizeSaleAccess)(), customerController_1.deleteCustomer);
router.post("/export", authMiddleware_1.default, (0, orderRoutes_1.authorizeSaleAccess)(), customerController_1.exportExcelCustomer);
exports.default = router;
//# sourceMappingURL=customerRoutes.js.map