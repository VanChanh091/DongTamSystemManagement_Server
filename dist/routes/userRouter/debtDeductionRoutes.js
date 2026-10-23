"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = __importDefault(require("../../middlewares/authMiddleware"));
const permissionMiddleware_1 = require("../../middlewares/permissionMiddleware");
const debtDeductionController_1 = require("../../controller/user/warehouse/debt/debtDeductionController");
const router = (0, express_1.default)();
// Xem danh sách (Sale xem của mình, Quản lý/Kế toán xem tất cả)
router.get("/", authMiddleware_1.default, debtDeductionController_1.getDebtDeductionRequests);
// Sale tạo yêu cầu
router.post("/", authMiddleware_1.default, debtDeductionController_1.createDebtDeductionRequest);
// Sale sửa yêu cầu (khi pending hoặc rejected)
router.put("/:requestId", authMiddleware_1.default, debtDeductionController_1.updateDebtDeductionRequest);
// Sale xóa yêu cầu (khi pending hoặc rejected)
router.delete("/:requestId", authMiddleware_1.default, debtDeductionController_1.deleteDebtDeductionRequest);
// Quản lý duyệt hoặc từ chối yêu cầu (Chỉ Admin và Manager, Accountant không được duyệt)
router.put("/:requestId/status", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["manager", "admin"]), debtDeductionController_1.updateDebtDeductionRequestStatus);
// Yêu cầu khẩn cấp: Gửi OTP về Telegram
router.post("/:requestId/urgent-otp", authMiddleware_1.default, debtDeductionController_1.requestUrgentDebtOtp);
// Nhập OTP để xác thực & duyệt ngay
router.post("/:requestId/verify-otp", authMiddleware_1.default, debtDeductionController_1.verifyUrgentOtpAndApprove);
exports.default = router;
//# sourceMappingURL=debtDeductionRoutes.js.map