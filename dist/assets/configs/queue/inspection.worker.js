"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.inspectionWorker = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const bullmq_1 = require("bullmq");
const user_1 = require("../../../models/user/user");
const socket_1 = require("../../../utils/socket/socket");
const redis_connect_1 = require("../connect/redis.connect");
const planningPaper_1 = require("../../../models/planning/planningPaper");
const requestType_1 = require("../../../service/notification/requestType");
const notification_1 = require("../../../models/notification/notification");
const userNotifications_1 = require("../../../models/notification/userNotifications");
const inspection_request_1 = require("../../../models/qualityControl/inspection/inspection_request");
const devEnvironment = process.env.NODE_ENV !== "production";
exports.inspectionWorker = new bullmq_1.Worker("INSPECTION_TIMER_QUEUE", async (job) => {
    const { inspectionId } = job.data;
    // Kiểm tra trạng thái thực tế trong Database kèm máy sản xuất
    const request = await inspection_request_1.InspectionRequest.findByPk(inspectionId, {
        include: [{ model: planningPaper_1.PlanningPaper, attributes: ["planningId", "orderId", "chooseMachine"] }],
    });
    // Nếu không còn PENDING (QC đã nhận, đã hủy...), bỏ qua
    if (!request || request.status !== "pending")
        return;
    // lấy instance của socket
    const io = (0, socket_1.getIO)();
    const machine = request.PlanningPaper?.chooseMachine || "";
    const orderId = request.PlanningPaper?.orderId || "";
    // Job nhắc nhở khi sắp hết hạn (3 phút)
    if (job.name === "REMIND_QC") {
        const reminderMessage = `Đơn hàng: ${orderId} tại ${machine} còn 2 phút để tiếp nhận kiểm tra!`;
        // 1. Phát socket nghiệp vụ chuyên biệt
        io.to("department-qc").emit("INSPECTION_REMINDER", {
            inspectionId: request.inspectionId,
            planningId: request.planningId,
            machine,
            remainingSeconds: 120,
            message: reminderMessage,
        });
        // 2. Tạo Notification trong DB và phát socket 'new-notification' cho Flutter UI
        try {
            const qcUsers = await user_1.User.findAll({
                where: { department: "QC" },
                attributes: ["userId", "department"],
            });
            if (qcUsers.length > 0) {
                const newNotif = await notification_1.NotificationModel.create({
                    title: reminderMessage,
                    type: requestType_1.RequestType.INSPECTION_REMIND,
                    targetType: "department",
                    senderId: 0,
                    senderName: "Hệ Thống",
                    senderDept: "Hệ thống",
                    payload: {
                        orderId,
                        planningId: request.planningId,
                        inspectionId: request.inspectionId,
                        machine,
                        action: "REMIND",
                        status: "pending",
                        remainingSeconds: 120,
                    },
                });
                const userNotifications = qcUsers.map((qcUser) => ({
                    notificationId: newNotif.notificationId,
                    receiverId: qcUser.userId,
                    receiverDept: qcUser.department || "QC",
                    isRead: false,
                }));
                await userNotifications_1.UserNotifications.bulkCreate(userNotifications);
                // Phát socket 'new-notification' tới room 'department-qc' để UI NotificationController nhận diện
                io.to("department-qc").emit("new-notification", {
                    ...newNotif.toJSON(),
                    isRead: false,
                    userNotifyId: 0,
                });
            }
        }
        catch (err) {
            console.error("❌ Lỗi khi gửi thông báo nhắc nhở QC:", err);
        }
        return;
    }
}, {
    connection: redis_connect_1.redisConfig,
    concurrency: 5, // Cho phép xử lý đồng thời tối đa 5 jobs
});
exports.inspectionWorker.on("completed", (job) => {
    if (devEnvironment)
        console.log(`[InspectionWorker] Job ${job.id} (${job.name}) hoàn thành thành công.`);
});
exports.inspectionWorker.on("failed", (job, err) => {
    if (devEnvironment)
        console.error(`[InspectionWorker] ❌ Job ${job?.id} (inspectionId: ${job?.data?.inspectionId}) thất bại:`, err);
});
//# sourceMappingURL=inspection.worker.js.map