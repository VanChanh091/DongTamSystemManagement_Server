"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = __importDefault(require("../../middlewares/authMiddleware"));
const notificationController_1 = require("../../controller/notification/notificationController");
const permissionMiddleware_1 = require("../../middlewares/permissionMiddleware");
const router = (0, express_1.default)();
//=======================NOTIFICATION=======================
router.get("/", authMiddleware_1.default, notificationController_1.getMyNofitications);
router.put("/", authMiddleware_1.default, notificationController_1.confirmRequestChanging);
//=======================EVENT=======================
router.post("/order", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["sale"]), notificationController_1.requestChangeInfoOrder);
router.post("/planning", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["plan"]), notificationController_1.handleRequestChanging);
// Ném đoạn này vào file route hoặc app.ts của Node.js
router.get("/test-push", (req, res) => {
    // Vì log trước báo sếp đang login User 1 (Admin), ta ép bắn thẳng vào room 'user-1'
    const targetRoom = "user-1";
    const mockNotification = {
        notificationId: 999,
        title: "🔔 LOG TEST: Đường truyền Socket thông suốt!",
        sender_id: 99,
        sender_dept: "SYSTEM_TEST",
        payload: {
            status: "pending", // Đặt pending để nó hiện nút Duyệt cho sếp xem thử luôn
            orderId: "TEST-777",
            reason: "Bắn thử nghiệm hệ thống mạng lưới real-time",
        },
        isRead: false,
        createdAt: new Date().toISOString(),
    };
    console.log(`\n=================== 🚀 [BE SOCKET TEST] ===================`);
    console.log(`📡 Tiến hành phát tín hiệu thử nghiệm tới phòng: ${targetRoom}`);
    // Lấy thực thể io từ biến toàn cục hoặc req của sếp để emit
    // Sếp thay thế bằng biến io thực tế của dự án nhé (ví dụ: global.io hoặc req.app.get('io'))
    req.io.to(targetRoom).emit("new-notification", mockNotification);
    const clientsInRoom = req.io?.sockets.adapter.rooms.get(targetRoom);
    console.log(`👥 Số lượng thiết bị đang online trong phòng [${targetRoom}] này là: ${clientsInRoom ? clientsInRoom.size : 0} máy.`);
    console.log(`✅ Đã phát xong sự kiện 'new-notification'! Đang chờ FE tiếp sóng...`);
    console.log(`===========================================================\n`);
    return res.json({
        success: true,
        message: "Đã kích hoạt mạch thử nghiệm thành công! Hãy kiểm tra Console ở Flutter.",
    });
});
exports.default = router;
//# sourceMappingURL=notificationRoutes.js.map