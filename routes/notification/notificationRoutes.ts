import Router from "express";
import authenticate from "../../middlewares/authMiddleware";
import {
  getMyNofitications,
  requestChangeInfoOrder,
  handleRequestChanging,
  confirmRequestChanging,
} from "../../controller/notification/notificationController";
import { authorizeAnyPermission } from "../../middlewares/permissionMiddleware";

const router = Router();

//=======================NOTIFICATION=======================
router.get("/", authenticate, getMyNofitications);
router.put("/", authenticate, confirmRequestChanging);

//=======================EVENT=======================
router.post("/order", authenticate, authorizeAnyPermission(["sale"]), requestChangeInfoOrder);
router.post("/planning", authenticate, authorizeAnyPermission(["plan"]), handleRequestChanging);

// Ném đoạn này vào file route hoặc app.ts của Node.js
router.get("/test-push", (req: any, res) => {
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
  console.log(
    `👥 Số lượng thiết bị đang online trong phòng [${targetRoom}] này là: ${clientsInRoom ? clientsInRoom.size : 0} máy.`,
  );
  console.log(`✅ Đã phát xong sự kiện 'new-notification'! Đang chờ FE tiếp sóng...`);
  console.log(`===========================================================\n`);

  return res.json({
    success: true,
    message: "Đã kích hoạt mạch thử nghiệm thành công! Hãy kiểm tra Console ở Flutter.",
  });
});

export default router;
