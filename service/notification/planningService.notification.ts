import { Request } from "express";
import { User } from "../../models/user/user";
import { AppError } from "../../utils/appError";
import { runInTransaction } from "../../utils/helper/transactionHelper";
import { NotificationModel } from "../../models/notification/notification";
import { REQUEST_CONFIG, RequestType } from "./requestType";
import { UserNotifications } from "../../models/notification/userNotifications";
import { notificationRepository } from "../../repository/notificationRepository";

export const planningServiceNotification = {
  //notification
  handleRequestChangeInfoOrder: async ({
    req,
    notificationId,
    senderId,
    action,
  }: {
    req: Request;
    notificationId: number;
    senderId: number;
    action: "approved" | "rejected";
  }) => {
    try {
      let createdResponseNotif: any = null;
      let createdAccountingNotif: any = null;
      let originalSenderId: number | null = null;

      const ACCOUNTING_KEY = "Accountant";

      await runInTransaction(async (transaction) => {
        const originalNotif = await NotificationModel.findOne({
          where: { notificationId },
          transaction,
        });
        if (!originalNotif) {
          throw AppError.NotFound("Notification not found", "NOTIFICATION_NOT_FOUND");
        }

        const config = REQUEST_CONFIG[originalNotif.type];
        if (!config) {
          throw AppError.BadRequest("Loại yêu cầu không hợp lệ", "INVALID_REQUEST_TYPE");
        }

        //update info from notificaton
        const payload = originalNotif.payload as Record<string, any>;
        const rootNotificationId = originalNotif.notificationId;
        originalSenderId = originalNotif.senderId;

        await Promise.all([
          originalNotif.update({ payload: { ...payload, status: action } }, { transaction }),
          UserNotifications.update(
            { isRead: true },
            { where: { notificationId: rootNotificationId }, transaction },
          ),
        ]);

        const responseTitle = action === "approved" ? config.titleApproved : config.titleRejected;
        const typeNotification =
          action === "approved" ? RequestType.ORDER_CONFIRM : RequestType.ORDER_REJECT;

        // luồng 1-1 user - planning
        const responseNoti = await notificationRepository.createNotification({
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

        await notificationRepository.createUserNotification({
          notificationId: responseNoti.notificationId,
          receiverId: originalNotif.senderId,
          receiverDept: originalNotif.senderDept || null,
          transaction,
        });

        createdResponseNotif = responseNoti;

        // luồng 1-n user - accounting
        if (action === "approved") {
          const accountingUsers = await User.findAll({
            where: { department: ACCOUNTING_KEY },
            transaction,
          });

          if (accountingUsers.length > 0) {
            const accountingNotif = await notificationRepository.createNotification({
              title: "Cập nhật thông tin đơn hàng",
              type: RequestType.ORDER_UPDATE,
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

            await UserNotifications.bulkCreate(userNotifications, { transaction });
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
    } catch (error) {
      console.log("Error in confirm request change info order:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },
};
