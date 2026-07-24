import { Transaction } from "sequelize";
import { NotificationModel, NotiTargetType } from "../models/notification/notification";
import { UserNotifications } from "../models/notification/userNotifications";

//==========================INTERFACE=============================
interface userNotificationPayload {
  notificationId: number;
  receiverId: number;
  receiverDept: string | null;
  transaction: Transaction;
}

interface notificationPayload {
  title: string;
  type: string;
  targetType: NotiTargetType;
  senderId: number;
  senderName: string;
  senderDept: string;
  status: string;
  payload: Record<string, any>;
  transaction: Transaction;
}

export const notificationRepository = {
  //==========================NOTIFICATION=============================
  getMyNotifications: async (userId: number) => {
    return await UserNotifications.findAll({
      where: { receiverId: userId, isRead: false },
      attributes: { exclude: ["updatedAt"] },
      include: [
        {
          model: NotificationModel,
          as: "notification",
          attributes: { exclude: ["updatedAt"] },
        },
      ],
      order: [["createdAt", "DESC"]],
    });
  },

  createNotification: async ({
    title,
    type,
    targetType,
    senderId,
    senderName,
    senderDept,
    status,
    payload = {},
    transaction,
  }: notificationPayload) => {
    return await NotificationModel.create(
      {
        title,
        type,
        targetType,
        senderId,
        senderName,
        senderDept,
        payload: { ...payload, status },
      },
      { transaction },
    );
  },

  createUserNotification: async ({
    notificationId,
    receiverId,
    receiverDept,
    transaction,
  }: userNotificationPayload) => {
    return await UserNotifications.create(
      { notificationId, receiverId, receiverDept },
      { transaction },
    );
  },

  //=============================ORDER=================================
  //============================PLANNING===============================
};
