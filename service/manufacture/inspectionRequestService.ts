import { Op } from "sequelize";
import { InspectionRequest } from "../../models/qualityControl/inspection/inspection_request";
import { AppError } from "../../utils/appError";
import { runInTransaction } from "../../utils/helper/transactionHelper";
import {
  cancelInspectionTimers,
  scheduleInspectionTimers,
} from "../../assets/configs/queue/inspection.queue";
import { getIO } from "../../utils/socket/socket";
import { NotificationModel } from "../../models/notification/notification";
import { UserNotifications } from "../../models/notification/userNotifications";
import { PlanningPaper } from "../../models/planning/planningPaper";
import { RequestType } from "../notification/requestType";
import { notificationService } from "../notification/notificationService";

export const inspectionRequestService = {
  //Tạo yêu cầu kiểm tra mới từ sản xuất
  createInspectionRequest: async ({
    planningId,
    requestedBy,
    user,
    data,
  }: {
    planningId: number;
    requestedBy?: string;
    user?: any;
    data?: any;
  }) => {
    try {
      const requester = requestedBy || data?.requestedBy || user?.fullName || "Sản xuất";

      // Tìm thông tin kế hoạch để lấy máy sản xuất và mã đơn hàng
      const planning = await PlanningPaper.findByPk(planningId, {
        attributes: ["planningId", "chooseMachine", "orderId"],
      });
      if (!planning) {
        throw AppError.NotFound("Không tìm thấy kế hoạch sản xuất", "PLANNING_NOT_FOUND");
      }
      const machine = planning.chooseMachine;

      const newRequest = await runInTransaction(async (transaction) => {
        const existingRequest = await InspectionRequest.findOne({
          where: { planningId, status: { [Op.in]: ["pending", "in_progress"] } },
          transaction,
        });
        if (existingRequest) {
          throw AppError.BadRequest(
            "Yêu cầu đã được tạo và đang chờ tiếp nhận",
            "INSPECTION_REQUEST_EXISTS",
          );
        }

        const now = new Date();

        // Tạo yêu cầu kiểm tra mới
        return await InspectionRequest.create(
          {
            planningId,
            requestedBy: requester,
            requestedAt: now,
            status: "pending",
          },
          { transaction },
        );
      });

      // đẩy vào BullMQ để QC nhận yêu cầu
      await scheduleInspectionTimers(newRequest.inspectionId);

      // gửi thông báo 1 chiều đến phòng QC
      await notificationService.notiffyQcDepartment({
        planningId: newRequest.planningId,
        inspectionId: newRequest.inspectionId,
        machine,
        orderId: planning.orderId,
        requestedBy: newRequest.requestedBy,
        requestedAt: newRequest.requestedAt,
        user,
      });

      return { message: "Yêu cầu kiểm tra đã được tạo thành công", data: newRequest };
    } catch (error) {
      console.error("Error creating inspection request:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  // QC đã tiếp nhận yêu cầu
  qcReceivedRequest: async ({
    inspectionId,
    userName,
    userId,
  }: {
    inspectionId: number;
    userName: string;
    userId?: number;
  }) => {
    try {
      let isQcOnTime = true;

      const updatedRequest = await runInTransaction(async (transaction) => {
        const request = await InspectionRequest.findByPk(inspectionId, { transaction });
        if (!request) {
          throw AppError.NotFound(
            "Không tìm thấy yêu cầu kiểm tra",
            "INSPECTION_REQUEST_NOT_FOUND",
          );
        }

        if (request.status !== "pending") {
          throw AppError.BadRequest(
            "Yêu cầu kiểm tra đã được tiếp nhận hoặc đã hết hạn",
            "REQUEST_ALREADY_RECEIVED_OR_EXPIRED",
          );
        }

        // cập nhật trạng thái yêu cầu kiểm tra
        const arrivedTime = new Date();
        const diffInMilliseconds = arrivedTime.getTime() - new Date(request.requestedAt).getTime();

        // Nếu đến trong vòng <= 5 phút thì result = true
        // Nếu > 5 phút thì result = false
        isQcOnTime = diffInMilliseconds <= 5 * 60 * 1000;

        await request.update(
          {
            status: "in_progress",
            arrivedAt: arrivedTime,
            completedBy: userName,
            result: isQcOnTime,
          },
          { transaction },
        );

        return request;
      });

      // Đánh dấu đã đọc tất cả thông báo liên quan đến inspection này cho TẤT CẢ nhân sự QC
      try {
        const relatedNotifs = await NotificationModel.findAll({
          where: {
            type: { [Op.in]: [RequestType.INSPECTION_REQUEST, RequestType.INSPECTION_REMIND] },
            payload: { inspectionId },
          },
          attributes: ["notificationId"],
        });
        if (relatedNotifs.length > 0) {
          const notifIds = relatedNotifs.map((n) => n.notificationId);
          await UserNotifications.update(
            { isRead: true },
            {
              where: {
                notificationId: { [Op.in]: notifIds },
              },
            },
          );
        }
      } catch (notifErr) {
        console.error("Lỗi khi cập nhật isRead thông báo QC:", notifErr);
      }

      // hủy BullMQ timer
      await cancelInspectionTimers(inspectionId);

      // cập nhật socket trạng thái cho phòng QC
      try {
        const io = getIO();
        io.to("department-qc").emit("INSPECTION_STATUS_CHANGED", {
          inspectionId: updatedRequest.inspectionId,
          planningId: updatedRequest.planningId,
          status: "in_progress",
          assignedTo: userName,
        });
      } catch (error) {
        console.error("Error emitting inspection status changed:", error);
        if (error instanceof AppError) throw error;
      }

      return {
        message: `Yêu cầu kiểm tra đã được tiếp nhận bởi ${userName}.`,
        result: isQcOnTime,
        data: updatedRequest,
      };
    } catch (error) {
      console.error("Error qc received request:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  // QC cập nhật kết quả kiểm tra
  updateInspectionRequest: async ({
    inspectionId,
    status,
    completedBy,
  }: {
    inspectionId: number;
    status: "passed" | "failed";
    completedBy: string;
  }) => {
    try {
      const updatedRequest = await runInTransaction(async (transaction) => {
        // 1. Kiểm tra tính hợp lệ của trạng thái
        if (!["passed", "failed"].includes(status)) {
          throw AppError.BadRequest(
            "Trạng thái cập nhật không hợp lệ",
            "INVALID_INSPECTION_STATUS",
          );
        }

        const request = await InspectionRequest.findByPk(inspectionId, { transaction });
        if (!request) {
          throw AppError.NotFound(
            "Không tìm thấy yêu cầu kiểm tra",
            "INSPECTION_REQUEST_NOT_FOUND",
          );
        }

        // Cập nhật trạng thái và người tiếp nhận kiểm tra
        await request.update({ status, completedBy }, { transaction });

        return request;
      });

      // cập nhật socket kết quả kiểm tra cho phòng QC
      try {
        const io = getIO();
        io.to("department-qc").emit("INSPECTION_COMPLETED", {
          inspectionId: updatedRequest.inspectionId,
          planningId: updatedRequest.planningId,
          status: updatedRequest.status,
          completedBy: updatedRequest.completedBy,
        });
      } catch (error) {
        console.error("Error emitting inspection completed:", error);
        if (error instanceof AppError) throw error;
      }

      return {
        message:
          status === "passed" ? "Đã xác nhận kiểm tra: ĐẠT" : "Đã xác nhận kiểm tra: KHÔNG ĐẠT",
        data: updatedRequest,
      };
    } catch (error) {
      console.error("Error updating inspection request:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  // Lấy lịch sử yêu cầu kiểm tra theo planningId
  getInspectionRequest: async (planningId: number) => {
    try {
      const requests = await InspectionRequest.findAll({
        where: { planningId },
        order: [["createdAt", "DESC"]],
      });
      return { message: "Lấy danh sách yêu cầu kiểm tra thành công", data: requests };
    } catch (error) {
      console.error("Error getting inspection requests by planning:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  // Lấy danh sách các yêu cầu kiểm tra đang chờ QC tiếp nhận
  getPendingInspectionRequests: async () => {
    try {
      const requests = await InspectionRequest.findAll({
        where: { status: "pending" },
        include: [{ model: PlanningPaper, attributes: ["planningId", "orderId", "chooseMachine"] }],
        order: [["requestedAt", "ASC"]],
      });
      return { message: "Lấy danh sách yêu cầu kiểm tra đang chờ thành công", data: requests };
    } catch (error) {
      console.error("Error getting pending inspection requests:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },
};
