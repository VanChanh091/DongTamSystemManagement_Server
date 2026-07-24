import { Request } from "express";
import { AppError } from "../../utils/appError";
import { REQUEST_CONFIG, RequestType } from "./requestType";
import { runInTransaction } from "../../utils/helper/transactionHelper";
import { NotificationModel } from "../../models/notification/notification";
import { UserNotifications } from "../../models/notification/userNotifications";
import { notificationRepository } from "../../repository/notificationRepository";

export const notificationService = {
  getMyNofitications: async (req: Request) => {
    const { userId } = req.user;

    try {
      const userNotifications = await notificationRepository.getMyNotifications(userId);

      // Bóc tách JSON phẳng (Flatten) gửi về cho Flutter dễ parse
      const formattedData = userNotifications.map((item: any) => {
        const notifData = item.notification ? item.notification.toJSON() : {};
        return {
          ...notifData,
          userNotifyId: item.userNotifyId,
          isRead: item.isRead,
        };
      });

      return { message: "Lấy thông báo thành công.", data: formattedData };
    } catch (error) {
      console.error("❌ Get my notifications failed:", error);
      throw AppError.ServerError();
    }
  },

  confirmRequestChanging: async ({
    notificationId,
    userId,
  }: {
    notificationId: number;
    userId: number;
  }) => {
    try {
      return await runInTransaction(async (transaction) => {
        const notification = await NotificationModel.findOne({
          where: { notificationId },
          transaction,
        });
        if (!notification) {
          throw AppError.NotFound("Notification not found", "NOTIFICATION_NOT_FOUND");
        }

        const config = REQUEST_CONFIG["ORDER_CONFIRM"];
        if (!config) {
          throw AppError.BadRequest("Invalid request type", "INVALID_REQUEST_TYPE");
        }

        const updatedPayload = {
          ...notification.payload,
          status: "confirmed",
          requestType: RequestType.ORDER_CONFIRM,
        };
        await notification.update({ payload: updatedPayload }, { transaction });

        await UserNotifications.update(
          { isRead: true },
          { where: { notificationId, receiverId: userId }, transaction },
        );

        return { message: "Đã xác nhận yêu cầu thay đổi thông tin đơn hàng" };
      });
    } catch (error) {
      console.error("Error in confirm request change info order:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },
};
