"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = __importDefault(require("../../middlewares/authMiddleware"));
const permissionMiddleware_1 = require("../../middlewares/permissionMiddleware");
const debtManagementController_1 = require("../../controller/user/warehouse/debt/debtManagementController");
const uploadImage_1 = __importDefault(require("../../utils/image/uploadImage"));
const debtDeductionController_1 = require("../../controller/user/warehouse/debt/debtDeductionController");
const paymentAllocationController_1 = require("../../controller/user/warehouse/debt/paymentAllocationController");
const orderRoutes_1 = require("./orderRoutes");
const router = (0, express_1.default)();
const authorizeDebtAccess = ({ departments = [], permissions = [], requireDept = true, } = {}) => (0, permissionMiddleware_1.authorizeAccess)({
    departments: [...new Set(["Accountant", ...departments])],
    permissions: [...new Set(["accountant", ...permissions])],
    requireDept,
});
//=============================PAYMENT ALLOCATION===================================
router.get("/allocations/outbound", authMiddleware_1.default, authorizeDebtAccess({ departments: ["Sale"], permissions: ["sale"] }), paymentAllocationController_1.getPaymentAlocationHistory);
router.post("/allocations/export", authMiddleware_1.default, authorizeDebtAccess(), paymentAllocationController_1.exportExcelPaymentAllocations);
//=================================CLOSING DEBT=======================================
router.get("/closing-debt", authMiddleware_1.default, debtManagementController_1.getCustomerDebtSummary);
router.post("/closing-debt", authMiddleware_1.default, authorizeDebtAccess(), debtManagementController_1.handleClosingDebt);
router.post("/closing-debt/export", authMiddleware_1.default, authorizeDebtAccess(), debtManagementController_1.exportDebtCustomer);
//=================================PAYMENT=======================================
router.post("/payment", authMiddleware_1.default, authorizeDebtAccess(), debtManagementController_1.paymentDebtByCustomerId);
router.post("/payment/import", authMiddleware_1.default, uploadImage_1.default.single("file"), authorizeDebtAccess(), debtManagementController_1.importAmountPayment);
router.put("/payment", authMiddleware_1.default, authorizeDebtAccess(), debtManagementController_1.writeOffDebt);
//=================================DEDUCTION REQUESTS===========================
router.get("/deduction-requests", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAccess)({ departments: ["Accountant", "Sale"], permissions: ["accountant", "sale"] }), debtDeductionController_1.getDebtDeductionRequests);
router.post("/deduction-requests", authMiddleware_1.default, (0, orderRoutes_1.authorizeSaleAccess)(), debtDeductionController_1.createDebtDeduction);
router.put("/deduction-requests", authMiddleware_1.default, (0, orderRoutes_1.authorizeSaleAccess)(), debtDeductionController_1.updateDebtDeduction);
router.delete("/deduction-requests", authMiddleware_1.default, (0, orderRoutes_1.authorizeSaleAccess)(), debtDeductionController_1.deleteDebtDeduction);
// Gửi OTP khẩn cấp về Telegram
router.post("/deduction-requests/otp", authMiddleware_1.default, (0, orderRoutes_1.authorizeSaleAccess)(), debtDeductionController_1.requestOrVerifyUrgentOtp);
// approve or reject debt deduction request
router.put("/deduction-requests/status", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAccess)({ departments: ["Accountant"], permissions: [], requireDept: true }), debtDeductionController_1.updateDebtDeductionStatus);
router.post("/deduction-requests/export", authMiddleware_1.default, debtDeductionController_1.exportExcelReportDebt);
exports.default = router;
//# sourceMappingURL=debtManagementRoutes.js.map