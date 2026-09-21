"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationService = void 0;
const appError_1 = require("../../utils/appError");
const requestType_1 = require("./requestType");
const transactionHelper_1 = require("../../utils/helper/transactionHelper");
const notification_1 = require("../../models/notification/notification");
const userNotifications_1 = require("../../models/notification/userNotifications");
const notificationRepository_1 = require("../../repository/notificationRepository");
exports.notificationService = {
    getMyNofitications: async (req) => {
        const { userId } = req.user;
        try {
            const userNotifications = await notificationRepository_1.notificationRepository.getMyNotifications(userId);
            // Bóc tách JSON phẳng (Flatten) gửi về cho Flutter dễ parse
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
};
//# sourceMappingURL=notificationService.js.map