"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyUrgentOtpAndApprove = exports.requestUrgentDebtOtp = exports.updateDebtDeductionRequestStatus = exports.deleteDebtDeductionRequest = exports.updateDebtDeductionRequest = exports.createDebtDeductionRequest = exports.getDebtDeductionRequests = void 0;
const debtDeductionService_1 = require("../../../service/warehouse/debtDeductionService");
const getDebtDeductionRequests = async (req, res, next) => {
    try {
        const { page, pageSize, status, customerId } = req.query;
        const isSale = req.user.permissions?.includes("sale");
        const result = await debtDeductionService_1.debtDeductionService.getRequests({
            page: page ? Number(page) : 1,
            pageSize: pageSize ? Number(pageSize) : 20,
            status,
            customerId,
            userId: req.user.userId,
            isSale,
        });
        return res.status(200).json(result);
    }
    catch (error) {
        next(error);
    }
};
exports.getDebtDeductionRequests = getDebtDeductionRequests;
const createDebtDeductionRequest = async (req, res, next) => {
    try {
        const { customerId, amountRequested, paymentMethod } = req.body;
        const result = await debtDeductionService_1.debtDeductionService.createRequest({
            req,
            customerId,
            amountRequested: Number(amountRequested),
            paymentMethod,
        });
        return res.status(201).json(result);
    }
    catch (error) {
        next(error);
    }
};
exports.createDebtDeductionRequest = createDebtDeductionRequest;
const updateDebtDeductionRequest = async (req, res, next) => {
    try {
        const { requestId } = req.params;
        const { amountRequested, paymentMethod } = req.body;
        const result = await debtDeductionService_1.debtDeductionService.updateRequest({
            req,
            requestId: Number(requestId),
            amountRequested: amountRequested !== undefined ? Number(amountRequested) : undefined,
            paymentMethod,
        });
        return res.status(200).json(result);
    }
    catch (error) {
        next(error);
    }
};
exports.updateDebtDeductionRequest = updateDebtDeductionRequest;
const deleteDebtDeductionRequest = async (req, res, next) => {
    try {
        const { requestId } = req.params;
        const result = await debtDeductionService_1.debtDeductionService.deleteRequest({
            req,
            requestId: Number(requestId),
        });
        return res.status(200).json(result);
    }
    catch (error) {
        next(error);
    }
};
exports.deleteDebtDeductionRequest = deleteDebtDeductionRequest;
/**
 * Quản lý duyệt HOẶC từ chối yêu cầu (viết chung 1 hàm)
 */
const updateDebtDeductionRequestStatus = async (req, res, next) => {
    try {
        const { requestId } = req.params;
        const { status, rejectReason } = req.body;
        const result = await debtDeductionService_1.debtDeductionService.updateRequestStatus({
            req,
            requestId: Number(requestId),
            newStatus: status,
            rejectReason,
        });
        return res.status(200).json(result);
    }
    catch (error) {
        next(error);
    }
};
exports.updateDebtDeductionRequestStatus = updateDebtDeductionRequestStatus;
const requestUrgentDebtOtp = async (req, res, next) => {
    try {
        const { requestId } = req.params;
        const result = await debtDeductionService_1.debtDeductionService.requestUrgentOtp({
            req,
            requestId: Number(requestId),
        });
        return res.status(200).json(result);
    }
    catch (error) {
        next(error);
    }
};
exports.requestUrgentDebtOtp = requestUrgentDebtOtp;
const verifyUrgentOtpAndApprove = async (req, res, next) => {
    try {
        const { requestId } = req.params;
        const { otp } = req.body;
        const result = await debtDeductionService_1.debtDeductionService.verifyUrgentOtpAndApprove({
            req,
            requestId: Number(requestId),
            otp: Number(otp),
        });
        return res.status(200).json(result);
    }
    catch (error) {
        next(error);
    }
};
exports.verifyUrgentOtpAndApprove = verifyUrgentOtpAndApprove;
//# sourceMappingURL=debtDeductionController.js.map