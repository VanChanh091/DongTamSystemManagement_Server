import { Op } from "sequelize";
import { InspectionRequest } from "../../models/qualityControl/inspection/inspection_request";
import { AppError } from "../../utils/appError";
import { runInTransaction } from "../../utils/helper/transactionHelper";
import {
  cancelInspectionTimers,
  scheduleInspectionTimers,
} from "../../assets/configs/queue/inspection.queue";
import { getIO } from "../../utils/socket/socket";
import { User } from "../../models/user/user";
import { NotificationModel } from "../../models/notification/notification";
import { UserNotifications } from "../../models/notification/userNotifications";
import { PlanningPaper } from "../../models/planning/planningPaper";
import { REQUEST_CONFIG, RequestType } from "../notification/requestType";

export const inspectionRequestService = {
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

      // 1. Tìm thông tin kế hoạch để lấy máy sản xuất (chooseMachine) và mã đơn hàng (orderId)
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
            "Đã tồn tại yêu cầu kiểm tra cho kế hoạch này",
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

      // gửi thông báo 1 chiều đến phòng QC (socket nghiệp vụ + lưu DB notification + realtime)
      await notiffyQcDepartment({
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

  // qc đã tiếp nhận yêu cầu
  qcReceivedRequest: async ({
    inspectionId,
    userName,
  }: {
    inspectionId: number;
    userName: string;
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
            "Trạng thái cập nhật không hợp lệ (passed/failed)",
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
  getInspectionRequestByPlanningId: async (planningId: number) => {
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

// ============================= HELPER FUNCTION =============================
// Thông báo 1 chiều: Sản xuất gửi yêu cầu kiểm tra đến phòng QC
const notiffyQcDepartment = async ({
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
    const io = getIO();

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
        reason: `Yêu cầu kiểm tra sản phẩm tại ${machine || "máy"} cho kế hoạch ${planningId}`,
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
};
