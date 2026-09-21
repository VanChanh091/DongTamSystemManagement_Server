"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationRepository = void 0;
const notification_1 = require("../models/notification/notification");
const userNotifications_1 = require("../models/notification/userNotifications");
exports.notificationRepository = {
    //==========================NOTIFICATION=============================
    getMyNotifications: async (userId) => {
        return await userNotifications_1.UserNotifications.findAll({
            where: { receiverId: userId, isRead: false },
            attributes: { exclude: ["updatedAt"] },
            include: [
                {
                    model: notification_1.NotificationModel,
                    as: "notification",
                    attributes: { exclude: ["updatedAt"] },
                },
            ],
            order: [["createdAt", "DESC"]],
        });
    },
    createNotification: async ({ title, type, targetType, senderId, senderName, senderDept, status, payload = {}, transaction, }) => {
        return await notification_1.NotificationModel.create({
            title,
            type,
            targetType,
            senderId,
            senderName,
            senderDept,
            payload: { ...payload, status },
        }, { transaction });
    },
    createUserNotification: async ({ notificationId, receiverId, receiverDept, transaction, }) => {
        return await userNotifications_1.UserNotifications.create({ notificationId, receiverId, receiverDept }, { transaction });
    },
    //=============================ORDER=================================
    //============================PLANNING===============================
};
//# sourceMappingURL=notificationRepository.js.map