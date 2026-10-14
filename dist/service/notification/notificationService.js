"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationService = void 0;
const user_1 = require("../../models/user/user");
const appError_1 = require("../../utils/appError");
const socket_1 = require("../../utils/socket/socket");
const requestType_1 = require("./requestType");
const planningPaper_1 = require("../../models/planning/planningPaper");
const transactionHelper_1 = require("../../utils/helper/transactionHelper");
const notification_1 = require("../../models/notification/notification");
const userNotifications_1 = require("../../models/notification/userNotifications");
const notificationRepository_1 = require("../../repository/notificationRepository");
exports.notificationService = {
    getMyNofitications: async (req) => {
        try {
            const userNotifications = await notificationRepository_1.notificationRepository.getMyNotifications(req.user.userId);
            // Bóc tách JSON phẳng gửi về cho FE dễ parse
            const formattedData = userNotifications.map((item) => {
                const notifData = item.notification ? item.notification.toJSON() : {};
                return {
                    ...notifData,
                    userNotifyId: item.userNotifyId,
                    isRead: item.isRead,
                };
            });
            return { message: "Lấy thông báo thành công.", data: formattedData };
        }
        catch (error) {
            console.error("❌ Get my notifications failed:", error);
            throw appError_1.AppError.ServerError();
        }
    },
    // accept request from sale
    confirmRequestChanging: async ({ notificationId, userId, }) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const notification = await notification_1.NotificationModel.findOne({
                    where: { notificationId },
                    transaction,
                });
                if (!notification) {
                    throw appError_1.AppError.NotFound("Notification not found", "NOTIFICATION_NOT_FOUND");
                }
                // Nếu là thông báo kiểm tra QC: chỉ xác nhận đã đọc thông báo
                const isInspectionNotif = notification.type === requestType_1.RequestType.INSPECTION_REQUEST ||
                    notification.type === requestType_1.RequestType.INSPECTION_REMIND;
                if (isInspectionNotif) {
                    await userNotifications_1.UserNotifications.update({ isRead: true }, { where: { notificationId, receiverId: userId }, transaction });
                    return { message: "Đã xác nhận thông báo kiểm tra" };
                }
                const config = requestType_1.REQUEST_CONFIG["ORDER_CONFIRM"];
                if (!config) {
                    throw appError_1.AppError.BadRequest("Invalid request type", "INVALID_REQUEST_TYPE");
                }
                const updatedPayload = {
                    ...notification.payload,
                    status: "confirmed",
                    requestType: requestType_1.RequestType.ORDER_CONFIRM,
                };
                await notification.update({ payload: updatedPayload }, { transaction });
                await userNotifications_1.UserNotifications.update({ isRead: true }, { where: { notificationId, receiverId: userId }, transaction });
                return { message: "Đã xác nhận yêu cầu thay đổi thông tin đơn hàng" };
            });
        }
        catch (error) {
            console.error("Error in confirm request change info order:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    // Gửi thông báo đến phòng QC khi có yêu cầu kiểm tra mới
    notiffyQcDepartment: async ({ orderId, planningId, inspectionId, machine, requestedBy, requestedAt, user, }) => {
        const io = (0, socket_1.getIO)();
        try {
            // Phát socket nghiệp vụ thông báo yêu cầu kiểm tra mới đến phòng QC
            io.to("department-qc").emit("NEW_INSPECTION_REQUEST", {
                inspectionId,
                planningId,
                machine,
                requestedBy,
                requestedAt,
                message: `Có yêu cầu kiểm tra mới từ ${requestedBy || "Sản xuất"} tại ${machine || "máy"} cho kế hoạch ${planningId}`,
            });
            // Lưu Notification vào Database & phát socket new-notification
            const qcUsers = await user_1.User.findAll({
                where: { department: "QC" },
                attributes: ["userId", "department"],
            });
            if (qcUsers.length === 0) {
                console.warn("⚠️ Không tìm thấy nhân viên nào có department = 'QC'");
                return;
            }
            const config = requestType_1.REQUEST_CONFIG[requestType_1.RequestType.INSPECTION_REQUEST];
            if (!config) {
                throw appError_1.AppError.BadRequest("Invalid request type", "INVALID_REQUEST_TYPE");
            }
            // Tìm orderId từ planningId nếu chưa có
            let targetOrderId = orderId || "";
            if (!targetOrderId && planningId) {
                const planning = await planningPaper_1.PlanningPaper.findByPk(planningId, {
                    attributes: ["orderId"],
                });
                if (planning?.orderId) {
                    targetOrderId = planning.orderId;
                }
            }
            // Xác định thông tin người gửi (bộ phận sản xuất)
            let senderId = user?.userId || 0;
            let senderName = user?.fullName || requestedBy || "Sản xuất";
            let senderDept = user?.department || "SX";
            if (!user?.userId && requestedBy) {
                const foundUser = await user_1.User.findOne({
                    where: { fullName: requestedBy },
                    attributes: ["userId", "fullName", "department"],
                });
                if (foundUser) {
                    senderId = foundUser.userId;
                    senderName = foundUser.fullName;
                    senderDept = foundUser.department;
                }
            }
            const newNotif = await notification_1.NotificationModel.create({
                title: config.titleCreate(targetOrderId || String(planningId)),
                type: requestType_1.RequestType.INSPECTION_REQUEST,
                targetType: "department",
                senderId,
                senderName,
                senderDept,
                payload: {
                    orderId: targetOrderId,
                    planningId,
                    inspectionId,
                    machine,
                    reason: `Yêu cầu kiểm tra sản phẩm tại ${machine}`,
                    action: "REQUEST",
                    status: "pending",
                },
            });
            const userNotifications = qcUsers.map((qcUser) => ({
                notificationId: newNotif.notificationId,
                receiverId: qcUser.userId,
                receiverDept: qcUser.department || "QC",
                isRead: false,
            }));
            await userNotifications_1.UserNotifications.bulkCreate(userNotifications);
            // Phát socket realtime new-notification đến phòng QC
            io.to("department-qc").emit("new-notification", newNotif);
            return newNotif;
        }
        catch (error) {
            console.error("❌ Lỗi khi gửi thông báo cho phòng QC:", error);
        }
    },
};
//# sourceMappingURL=notificationService.js.map