import { Request } from "express";
import { User } from "../../models/user/user";
import { REQUEST_CONFIG } from "./requestType";
import { AppError } from "../../utils/appError";
import { runInTransaction } from "../../utils/helper/transactionHelper";
import { notificationRepository } from "../../repository/notificationRepository";

export const OrderServiceNotification = {
  //notification
  requestChangeInfoOrder: async ({
    req,
    senderId,
    receiverId,
  }: {
    req: Request;
    senderId: number;
    receiverId: number;
  }) => {
    const { orderId, requestType, newDeliveryDate, reason } = req.body;

    // console.log(
    //   `body: ${JSON.stringify(req.body)}, senderId: ${senderId}, receiverId: ${receiverId}`,
    // );

    const config = REQUEST_CONFIG[requestType];
    if (!config) {
      throw AppError.BadRequest("Loại yêu cầu không hợp lệ", "INVALID_REQUEST_TYPE");
    }

    if (!orderId) {
      throw AppError.BadRequest("Mã đơn hàng không được để trống", "ORDER_ID_REQUIRED");
    }

    if (requestType === "ORDER_CHANGE_DATE" && !newDeliveryDate) {
      throw AppError.BadRequest(
        "Ngày giao hàng mới không được để trống",
        "NEW_DELIVERY_DATE_REQUIRED",
      );
    }

    const payload: Record<string, any> = {
      orderId,
      reason,
      action: "REQUEST",
    };

    if (requestType === "ORDER_CHANGE_DATE") {
      payload.newDeliveryDate = newDeliveryDate;
    }

    let createdNotifData: any = null;

    try {
      await runInTransaction(async (transaction) => {
        // lấy thông tin người nhận
        const receiver = await User.findOne({ where: { userId: receiverId }, transaction });
        if (!receiver) {
          throw AppError.NotFound("Không tìm thấy thông tin người nhận", "USER_NOT_FOUND");
        }

        const newNotif = await notificationRepository.createNotification({
          title: config.titleCreate(),
          type: requestType,
          targetType: "user",
          senderId: senderId,
          senderName: req.user.fullName,
          senderDept: req.user.department,
          status: "pending",
          payload,
          transaction,
        });

        await notificationRepository.createUserNotification({
          notificationId: newNotif.notificationId,
          receiverId: receiverId,
          receiverDept: receiver?.department || null,
          transaction,
        });

        createdNotifData = newNotif;
      });

      //socket
      // req.io?.to(`user-${newNotif.receiver_id}`).emit("new-notification", newNotif);
      if (createdNotifData) {
        req.io?.to(`user-${receiverId}`).emit("new-notification", createdNotifData);
      }

      const successMessage =
        requestType === "ORDER_CANCEL"
          ? "Đã gửi yêu cầu hủy đơn hàng thành công."
          : "Đã gửi yêu cầu thay đổi ngày giao hàng thành công.";

      return { message: successMessage };
    } catch (error) {
      console.error("Error in request change info order:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },
};
