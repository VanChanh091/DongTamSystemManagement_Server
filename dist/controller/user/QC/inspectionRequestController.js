"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPendingInspectionRequests = exports.getInspectionRequest = exports.updateInspectionRequest = exports.qcReceivedRequest = exports.createInspectionRequest = void 0;
const appError_1 = require("../../../utils/appError");
const inspectionRequestService_1 = require("../../../service/manufacture/inspectionRequestService");
// Tạo yêu cầu kiểm tra mới từ xưởng sản xuất
const createInspectionRequest = async (req, res, next) => {
    const { planningId } = req.query;
    try {
        if (!planningId) {
            throw appError_1.AppError.BadRequest("Mã kế hoạch planningId không hợp lệ hoặc bị thiếu", "MISSING_PARAMETERS");
        }
        const response = await inspectionRequestService_1.inspectionRequestService.createInspectionRequest({
            planningId: Number(planningId),
            requestedBy: req.user.fullName,
            user: req.user,
            data: req.body,
        });
        return res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.createInspectionRequest = createInspectionRequest;
// QC tiếp nhận yêu cầu kiểm tra
const qcReceivedRequest = async (req, res, next) => {
    const { inspectionId } = req.query;
    try {
        const response = await inspectionRequestService_1.inspectionRequestService.qcReceivedRequest({
            inspectionId: Number(inspectionId),
            userName: req.user.fullName,
            userId: req.user.userId,
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.qcReceivedRequest = qcReceivedRequest;
// QC cập nhật kết quả kiểm tra (passed / failed)
const updateInspectionRequest = async (req, res, next) => {
    const { inspectionId, status } = req.query;
    try {
        const response = await inspectionRequestService_1.inspectionRequestService.updateInspectionRequest({
            inspectionId: Number(inspectionId),
            status,
            completedBy: req.user?.fullName || req.body?.completedBy || "QC",
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateInspectionRequest = updateInspectionRequest;
// Lấy lịch sử yêu cầu kiểm tra theo planningId
const getInspectionRequest = async (req, res, next) => {
    const { planningId } = req.query;
    try {
        const response = await inspectionRequestService_1.inspectionRequestService.getInspectionRequest(Number(planningId));
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getInspectionRequest = getInspectionRequest;
// Lấy danh sách các yêu cầu đang chờ QC tiếp nhận
const getPendingInspectionRequests = async (_req, res, next) => {
    try {
        const response = await inspectionRequestService_1.inspectionRequestService.getPendingInspectionRequests();
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getPendingInspectionRequests = getPendingInspectionRequests;
//# sourceMappingURL=inspectionRequestController.js.map