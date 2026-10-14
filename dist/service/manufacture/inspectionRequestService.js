"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inspectionRequestService = void 0;
const sequelize_1 = require("sequelize");
const inspection_request_1 = require("../../models/qualityControl/inspection/inspection_request");
const appError_1 = require("../../utils/appError");
const transactionHelper_1 = require("../../utils/helper/transactionHelper");
const inspection_queue_1 = require("../../assets/configs/queue/inspection.queue");
const socket_1 = require("../../utils/socket/socket");
const notification_1 = require("../../models/notification/notification");
const userNotifications_1 = require("../../models/notification/userNotifications");
const planningPaper_1 = require("../../models/planning/planningPaper");
const requestType_1 = require("../notification/requestType");
const notificationService_1 = require("../notification/notificationService");
exports.inspectionRequestService = {
    //Tạo yêu cầu kiểm tra mới từ sản xuất
    createInspectionRequest: async ({ planningId, requestedBy, user, data, }) => {
        try {
            const requester = requestedBy || data?.requestedBy || user?.fullName || "Sản xuất";
            // Tìm thông tin kế hoạch để lấy máy sản xuất và mã đơn hàng
            const planning = await planningPaper_1.PlanningPaper.findByPk(planningId, {
                attributes: ["planningId", "chooseMachine", "orderId"],
            });
            if (!planning) {
                throw appError_1.AppError.NotFound("Không tìm thấy kế hoạch sản xuất", "PLANNING_NOT_FOUND");
            }
            const machine = planning.chooseMachine;
            const newRequest = await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const existingRequest = await inspection_request_1.InspectionRequest.findOne({
                    where: { planningId, status: { [sequelize_1.Op.in]: ["pending", "in_progress"] } },
                    transaction,
                });
                if (existingRequest) {
                    throw appError_1.AppError.BadRequest("Yêu cầu đã được tạo và đang chờ tiếp nhận", "INSPECTION_REQUEST_EXISTS");
                }
                const now = new Date();
                // Tạo yêu cầu kiểm tra mới
                return await inspection_request_1.InspectionRequest.create({
                    planningId,
                    requestedBy: requester,
                    requestedAt: now,
                    status: "pending",
                }, { transaction });
            });
            // đẩy vào BullMQ để QC nhận yêu cầu
            await (0, inspection_queue_1.scheduleInspectionTimers)(newRequest.inspectionId);
            // gửi thông báo 1 chiều đến phòng QC
            await notificationService_1.notificationService.notiffyQcDepartment({
                planningId: newRequest.planningId,
                inspectionId: newRequest.inspectionId,
                machine,
                orderId: planning.orderId,
                requestedBy: newRequest.requestedBy,
                requestedAt: newRequest.requestedAt,
                user,
            });
            return { message: "Yêu cầu kiểm tra đã được tạo thành công", data: newRequest };
        }
        catch (error) {
            console.error("Error creating inspection request:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    // QC đã tiếp nhận yêu cầu
    qcReceivedRequest: async ({ inspectionId, userName, userId, }) => {
        try {
            let isQcOnTime = true;
            const updatedRequest = await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const request = await inspection_request_1.InspectionRequest.findByPk(inspectionId, { transaction });
                if (!request) {
                    throw appError_1.AppError.NotFound("Không tìm thấy yêu cầu kiểm tra", "INSPECTION_REQUEST_NOT_FOUND");
                }
                if (request.status !== "pending") {
                    throw appError_1.AppError.BadRequest("Yêu cầu kiểm tra đã được tiếp nhận hoặc đã hết hạn", "REQUEST_ALREADY_RECEIVED_OR_EXPIRED");
                }
                // cập nhật trạng thái yêu cầu kiểm tra
                const arrivedTime = new Date();
                const diffInMilliseconds = arrivedTime.getTime() - new Date(request.requestedAt).getTime();
                // Nếu đến trong vòng <= 5 phút thì result = true
                // Nếu > 5 phút thì result = false
                isQcOnTime = diffInMilliseconds <= 5 * 60 * 1000;
                await request.update({
                    status: "in_progress",
                    arrivedAt: arrivedTime,
                    completedBy: userName,
                    result: isQcOnTime,
                }, { transaction });
                return request;
            });
            // Đánh dấu đã đọc tất cả thông báo liên quan đến inspection này cho user QC tiếp nhận
            if (userId) {
                try {
                    const relatedNotifs = await notification_1.NotificationModel.findAll({
                        where: {
                            type: { [sequelize_1.Op.in]: [requestType_1.RequestType.INSPECTION_REQUEST, requestType_1.RequestType.INSPECTION_REMIND] },
                            payload: { inspectionId },
                        },
                        attributes: ["notificationId"],
                    });
                    if (relatedNotifs.length > 0) {
                        const notifIds = relatedNotifs.map((n) => n.notificationId);
                        await userNotifications_1.UserNotifications.update({ isRead: true }, {
                            where: {
                                notificationId: { [sequelize_1.Op.in]: notifIds },
                                receiverId: userId,
                            },
                        });
                    }
                }
                catch (notifErr) {
                    console.error("Lỗi khi cập nhật isRead thông báo QC:", notifErr);
                }
            }
            // hủy BullMQ timer
            await (0, inspection_queue_1.cancelInspectionTimers)(inspectionId);
            // cập nhật socket trạng thái cho phòng QC
            try {
                const io = (0, socket_1.getIO)();
                io.to("department-qc").emit("INSPECTION_STATUS_CHANGED", {
                    inspectionId: updatedRequest.inspectionId,
                    planningId: updatedRequest.planningId,
                    status: "in_progress",
                    assignedTo: userName,
                });
            }
            catch (error) {
                console.error("Error emitting inspection status changed:", error);
                if (error instanceof appError_1.AppError)
                    throw error;
            }
            return {
                message: `Yêu cầu kiểm tra đã được tiếp nhận bởi ${userName}.`,
                result: isQcOnTime,
                data: updatedRequest,
            };
        }
        catch (error) {
            console.error("Error qc received request:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    // QC cập nhật kết quả kiểm tra
    updateInspectionRequest: async ({ inspectionId, status, completedBy, }) => {
        try {
            const updatedRequest = await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                // 1. Kiểm tra tính hợp lệ của trạng thái
                if (!["passed", "failed"].includes(status)) {
                    throw appError_1.AppError.BadRequest("Trạng thái cập nhật không hợp lệ", "INVALID_INSPECTION_STATUS");
                }
                const request = await inspection_request_1.InspectionRequest.findByPk(inspectionId, { transaction });
                if (!request) {
                    throw appError_1.AppError.NotFound("Không tìm thấy yêu cầu kiểm tra", "INSPECTION_REQUEST_NOT_FOUND");
                }
                // Cập nhật trạng thái và người tiếp nhận kiểm tra
                await request.update({ status, completedBy }, { transaction });
                return request;
            });
            // cập nhật socket kết quả kiểm tra cho phòng QC
            try {
                const io = (0, socket_1.getIO)();
                io.to("department-qc").emit("INSPECTION_COMPLETED", {
                    inspectionId: updatedRequest.inspectionId,
                    planningId: updatedRequest.planningId,
                    status: updatedRequest.status,
                    completedBy: updatedRequest.completedBy,
                });
            }
            catch (error) {
                console.error("Error emitting inspection completed:", error);
                if (error instanceof appError_1.AppError)
                    throw error;
            }
            return {
                message: status === "passed" ? "Đã xác nhận kiểm tra: ĐẠT" : "Đã xác nhận kiểm tra: KHÔNG ĐẠT",
                data: updatedRequest,
            };
        }
        catch (error) {
            console.error("Error updating inspection request:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    // Lấy lịch sử yêu cầu kiểm tra theo planningId
    getInspectionRequest: async (planningId) => {
        try {
            const requests = await inspection_request_1.InspectionRequest.findAll({
                where: { planningId },
                order: [["createdAt", "DESC"]],
            });
            return { message: "Lấy danh sách yêu cầu kiểm tra thành công", data: requests };
        }
        catch (error) {
            console.error("Error getting inspection requests by planning:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    // Lấy danh sách các yêu cầu kiểm tra đang chờ QC tiếp nhận
    getPendingInspectionRequests: async () => {
        try {
            const requests = await inspection_request_1.InspectionRequest.findAll({
                where: { status: "pending" },
                include: [{ model: planningPaper_1.PlanningPaper, attributes: ["planningId", "orderId", "chooseMachine"] }],
                order: [["requestedAt", "ASC"]],
            });
            return { message: "Lấy danh sách yêu cầu kiểm tra đang chờ thành công", data: requests };
        }
        catch (error) {
            console.error("Error getting pending inspection requests:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
};
//# sourceMappingURL=inspectionRequestService.js.map