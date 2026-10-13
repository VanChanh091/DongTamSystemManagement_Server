import { Request } from "express";
import { AppError } from "../../utils/appError";
import { REQUEST_CONFIG, RequestType } from "./requestType";
import { runInTransaction } from "../../utils/helper/transactionHelper";
import { NotificationModel } from "../../models/notification/notification";
import { UserNotifications } from "../../models/notification/userNotifications";
import { notificationRepository } from "../../repository/notificationRepository";
import { getIO } from "../../utils/socket/socket";
import { User } from "../../models/user/user";
import { PlanningPaper } from "../../models/planning/planningPaper";

const io = getIO();

export const notificationService = {
  getMyNofitications: async (req: Request) => {
    try {
      const userNotifications = await notificationRepository.getMyNotifications(req.user.userId);

      // Bóc tách JSON phẳng gửi về cho FE dễ parse
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

  // accept request from sale
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

        // Nếu là thông báo kiểm tra QC: chỉ xác nhận đã đọc thông báo
        const isInspectionNotif =
          notification.type === RequestType.INSPECTION_REQUEST ||
          notification.type === RequestType.INSPECTION_REMIND;

        if (isInspectionNotif) {
          await UserNotifications.update(
            { isRead: true },
            { where: { notificationId, receiverId: userId }, transaction },
          );
          return { message: "Đã xác nhận thông báo kiểm tra" };
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

  // Gửi thông báo đến phòng QC khi có yêu cầu kiểm tra mới
  notiffyQcDepartment: async ({
    orderId,
    planningId,
    inspectionId,
    machine,
    requestedBy,
    requestedAt,
    user,
  }: {
    orderId?: string;
    planningId: number;
    inspectionId: number;
    machine?: string;
    requestedBy?: string;
    requestedAt?: Date;
    user?: {
      userId?: number;
      fullName?: string;
      department?: string;
    };
  }) => {
    try {
      // 1. Phát socket nghiệp vụ thông báo yêu cầu kiểm tra mới đến phòng QC
      io.to("department-qc").emit("NEW_INSPECTION_REQUEST", {
        inspectionId,
        planningId,
        machine,
        requestedBy,
        requestedAt,
        message: `Có yêu cầu kiểm tra mới từ ${requestedBy || "Sản xuất"} tại ${machine || "máy"} cho kế hoạch ${planningId}`,
      });

      // 2. Lưu Notification vào Database & phát socket new-notification
      const qcUsers = await User.findAll({
        where: { department: "QC" },
        attributes: ["userId", "department"],
      });

      if (qcUsers.length === 0) {
        console.warn("⚠️ Không tìm thấy nhân viên nào có department = 'QC'");
        return;
      }

      const config = REQUEST_CONFIG[RequestType.INSPECTION_REQUEST];
      if (!config) {
        throw AppError.BadRequest("Invalid request type", "INVALID_REQUEST_TYPE");
      }

      // Tìm orderId từ planningId nếu chưa có
      let targetOrderId = orderId || "";
      if (!targetOrderId && planningId) {
        const planning = await PlanningPaper.findByPk(planningId, {
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
        const foundUser = await User.findOne({
          where: { fullName: requestedBy },
          attributes: ["userId", "fullName", "department"],
        });
        if (foundUser) {
          senderId = foundUser.userId;
          senderName = foundUser.fullName;
          senderDept = foundUser.department;
        }
      }

      const newNotif = await NotificationModel.create({
        title: config.titleCreate(targetOrderId || String(planningId)),
        type: RequestType.INSPECTION_REQUEST,
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

      await UserNotifications.bulkCreate(userNotifications);

      // Phát socket realtime new-notification đến phòng QC
      io.to("department-qc").emit("new-notification", newNotif);

      return newNotif;
    } catch (error) {
      console.error("❌ Lỗi khi gửi thông báo cho phòng QC:", error);
    }
  },
};
