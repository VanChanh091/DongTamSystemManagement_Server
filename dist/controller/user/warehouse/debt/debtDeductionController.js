"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateDebtDeductionStatus = exports.requestOrVerifyUrgentOtp = exports.deleteDebtDeduction = exports.updateDebtDeduction = exports.createDebtDeduction = exports.getDebtDeductionRequests = void 0;
const debtDeductionService_1 = require("../../../../service/warehouse/debtDeductionService");
const getDebtDeductionRequests = async (req, res, next) => {
    const { page, pageSize, status, customerId, userId } = req.query;
    try {
        if (!page || !pageSize) {
            return res
                .status(400)
                .json({ message: "Missing required query parameters: page and pageSize" });
        }
        const arrayStatus = Array.isArray(status) ? status : status ? [status] : [];
        const result = await debtDeductionService_1.debtDeductionService.getDebtDeductionRequests({
            page: Number(page),
            pageSize: Number(pageSize),
            status: arrayStatus,
            currentUser: req.user,
            targetUserId: userId ? Number(userId) : undefined,
            customerId: customerId ? customerId : undefined,
        });
        return res.status(200).json(result);
    }
    catch (error) {
        next(error);
    }
};
exports.getDebtDeductionRequests = getDebtDeductionRequests;
const createDebtDeduction = async (req, res, next) => {
    const { customerId, amountRequested, paymentMethod } = req.body;
    try {
        const result = await debtDeductionService_1.debtDeductionService.createRequest({
            currentUser: req.user,
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
exports.createDebtDeduction = createDebtDeduction;
const updateDebtDeduction = async (req, res, next) => {
    const { requestId } = req.query;
    const { amountRequested, paymentMethod } = req.body;
    try {
        const result = await debtDeductionService_1.debtDeductionService.updateRequest({
            currentUser: req.user,
            requestId: Number(requestId),
            amountRequested,
            paymentMethod,
        });
        return res.status(200).json(result);
    }
    catch (error) {
        next(error);
    }
};
exports.updateDebtDeduction = updateDebtDeduction;
const deleteDebtDeduction = async (req, res, next) => {
    const { requestId } = req.query;
    try {
        const result = await debtDeductionService_1.debtDeductionService.deleteRequest({
            currentUser: req.user,
            requestId: Number(requestId),
        });
        return res.status(200).json(result);
    }
    catch (error) {
        next(error);
    }
};
exports.deleteDebtDeduction = deleteDebtDeduction;
const requestOrVerifyUrgentOtp = async (req, res, next) => {
    const { requestId, otp } = req.query;
    try {
        let result;
        if (otp) {
            result = await debtDeductionService_1.debtDeductionService.verifyUrgentOtp({
                username: req.user.fullName,
                requestId: Number(requestId),
                otp: Number(otp),
            });
        }
        else {
            result = await debtDeductionService_1.debtDeductionService.requestUrgentOtp({
                requestId: Number(requestId),
            });
        }
        return res.status(200).json(result);
    }
    catch (error) {
        next(error);
    }
};
exports.requestOrVerifyUrgentOtp = requestOrVerifyUrgentOtp;
// approve or reject debt deduction request (for admin/manager)
const updateDebtDeductionStatus = async (req, res, next) => {
    const { requestId } = req.query;
    const { status, rejectReason } = req.body;
    try {
        const result = await debtDeductionService_1.debtDeductionService.updateRequestStatus({
            currentUser: req.user,
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
exports.updateDebtDeductionStatus = updateDebtDeductionStatus;
//# sourceMappingURL=debtDeductionController.js.map