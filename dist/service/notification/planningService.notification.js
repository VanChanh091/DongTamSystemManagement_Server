"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.planningServiceNotification = void 0;
const user_1 = require("../../models/user/user");
const appError_1 = require("../../utils/appError");
const transactionHelper_1 = require("../../utils/helper/transactionHelper");
const notification_1 = require("../../models/notification/notification");
const requestType_1 = require("./requestType");
const userNotifications_1 = require("../../models/notification/userNotifications");
const notificationRepository_1 = require("../../repository/notificationRepository");
const order_1 = require("../../models/order/order");
const cacheManager_1 = require("../../utils/helper/cache/cacheManager");
exports.planningServiceNotification = {
    //notification
    handleRequestChangeInfoOrder: async ({ req, notificationId, senderId, action, }) => {
        try {
            let createdResponseNotif = null;
            let createdAccountingNotif = null;
            let originalSenderId = null;
            const ACCOUNTING_KEY = "Accountant";
            await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const originalNotif = await notification_1.NotificationModel.findOne({
                    where: { notificationId },
                    transaction,
                });
                if (!originalNotif) {
                    throw appError_1.AppError.NotFound("Notification not found", "NOTIFICATION_NOT_FOUND");
                }
                const config = requestType_1.REQUEST_CONFIG[originalNotif.type];
                if (!config) {
                    throw appError_1.AppError.BadRequest("Loại yêu cầu không hợp lệ", "INVALID_REQUEST_TYPE");
                }
                //update info from notificaton
                const payload = originalNotif.payload;
                const rootNotificationId = originalNotif.notificationId;
                originalSenderId = originalNotif.senderId;
                //update order
                if (action === "approved") {
                    if (originalNotif.type === requestType_1.RequestType.ORDER_CHANGE_DATE) {
                        const [updatedRows] = await order_1.Order.update({ dateRequestShipping: payload.newDeliveryDate }, { where: { orderId: payload.orderId }, transaction });
                        if (updatedRows === 0) {
                            throw appError_1.AppError.NotFound("Không tìm thấy đơn hàng để cập nhật", "ORDER_NOT_FOUND");
                        }
                    }
                }
                await Promise.all([
                    originalNotif.update({ payload: { ...payload, status: action } }, { transaction }),
                    userNotifications_1.UserNotifications.update({ isRead: true }, { where: { notificationId: rootNotificationId }, transaction }),
                ]);
                const responseTitle = action === "approved" ? config.titleApproved : config.titleRejected;
                const typeNotification = action === "approved" ? requestType_1.RequestType.ORDER_CONFIRM : requestType_1.RequestType.ORDER_REJECT;
                // luồng 1-1 user - planning
                const responseNoti = await notificationRepository_1.notificationRepository.createNotification({
                    title: responseTitle,
                    type: typeNotification,
                    targetType: "user",
                    senderId: senderId,
                    senderName: req.user.fullName,
                    senderDept: req.user.department,
                    status: action,
                    payload: {
                        notificationId: rootNotificationId,
                        orderId: payload.orderId,
                        action: "RESPONSE",
                    },
                    transaction,
                });
                await notificationRepository_1.notificationRepository.createUserNotification({
                    notificationId: responseNoti.notificationId,
                    receiverId: originalNotif.senderId,
                    receiverDept: originalNotif.senderDept || null,
                    transaction,
                });
                createdResponseNotif = responseNoti;
                await cacheManager_1.CacheManager.clear("planningPaper");
                // luồng 1-n user - accounting
                if (action === "approved") {
                    const accountingUsers = await user_1.User.findAll({
                        where: { department: ACCOUNTING_KEY },
                        transaction,
                    });
                    if (accountingUsers.length > 0) {
                        const accountingNotif = await notificationRepository_1.notificationRepository.createNotification({
                            title: "Cập nhật thông tin đơn hàng",
                            type: requestType_1.RequestType.ORDER_UPDATE,
                            targetType: "department",
                            senderId: senderId,
                            senderName: req.user.fullName,
                            senderDept: req.user.department,
                            status: action,
                            payload: {
                                notificationId: rootNotificationId,
                                orderId: payload.orderId,
                                newDeliveryDate: payload.newDeliveryDate,
                                reason: payload.reason,
                                action: "RESPONSE",
                            },
                            transaction,
                        });
                        const userNotifications = accountingUsers.map((accountingUser) => ({
                            notificationId: accountingNotif.notificationId,
                            receiverId: accountingUser.userId,
                            receiverDept: accountingUser.department,
                        }));
                        await userNotifications_1.UserNotifications.bulkCreate(userNotifications, { transaction });
                        createdAccountingNotif = accountingNotif;
                    }
                }
            });
            if (createdResponseNotif && originalSenderId) {
                req.io?.to(`user-${originalSenderId}`).emit("new-notification", createdResponseNotif);
            }
            if (createdAccountingNotif) {
                req.io
                    ?.to(`department-${ACCOUNTING_KEY.toLowerCase()}`)
                    .emit("new-notification", createdAccountingNotif);
            }
            return { message: "Xác nhận thay đổi và thông báo phản hồi thành công." };
        }
        catch (error) {
            console.log("Error in confirm request change info order:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
};
//# sourceMappingURL=planningService.notification.js.map