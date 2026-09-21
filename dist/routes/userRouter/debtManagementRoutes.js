"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = __importDefault(require("../../middlewares/authMiddleware"));
const permissionMiddleware_1 = require("../../middlewares/permissionMiddleware");
const debtManagementController_1 = require("../../controller/user/warehouse/debtManagementController");
const uploadImage_1 = __importDefault(require("../../utils/image/uploadImage"));
const router = (0, express_1.default)();
//=================================CLOSING DEBT=======================================
router.get("/closing-debt", authMiddleware_1.default, debtManagementController_1.getCustomerDebtSummary);
router.post("/closing-debt", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["accountant"]), debtManagementController_1.handleClosingDebt);
router.post("/closing-debt/export", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["accountant"]), debtManagementController_1.exportDebtCustomer);
//=================================PAYMENT=======================================
router.post("/payment", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["accountant"]), debtManagementController_1.paymentDebtByCustomerId);
router.post("/payment/import", authMiddleware_1.default, uploadImage_1.default.single("file"), (0, permissionMiddleware_1.authorizeAnyPermission)(["accountant"]), debtManagementController_1.importAmountPayment);
router.put("/payment", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["accountant"]), debtManagementController_1.writeOffDebt);
exports.default = router;
//# sourceMappingURL=debtManagementRoutes.js.map