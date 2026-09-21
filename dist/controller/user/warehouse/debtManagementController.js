"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeOffDebt = exports.importAmountPayment = exports.paymentDebtByCustomerId = exports.exportDebtCustomer = exports.handleClosingDebt = exports.getCustomerDebtSummary = void 0;
const appError_1 = require("../../../utils/appError");
const debtManagementService_1 = require("../../../service/warehouse/debtManagementService");
//=================================CLOSING DEBT=======================================
const getCustomerDebtSummary = async (req, res, next) => {
    const { userId, page = 1, pageSize = 30, targetDate, search, } = req.query;
    try {
        const isSale = req.user.permissions.includes("sale");
        const rawUserId = isSale ? req.user.userId : userId;
        const targetUserId = rawUserId !== undefined && rawUserId !== "" ? Number(rawUserId) : undefined;
        const response = await debtManagementService_1.debtManagementService.getCustomerDebtSummary({
            page: Number(page),
            pageSize: Number(pageSize),
            userId: targetUserId,
            targetDate: targetDate,
            search,
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getCustomerDebtSummary = getCustomerDebtSummary;
const handleClosingDebt = async (req, res, next) => {
    const { customerId, targetDate, isAuto } = req.body;
    try {
        let response;
        const formatDate = targetDate ? new Date(targetDate) : new Date();
        if (isAuto) {
            response = await debtManagementService_1.debtManagementService.processAutoDebtClosing(formatDate);
        }
        else {
            if (!customerId) {
                throw appError_1.AppError.BadRequest("Cần truyền mã khách hàng khi chốt nợ thủ công", "MISSING_CUSTOMER_ID");
            }
            response = await debtManagementService_1.debtManagementService.closeDebtForSingleCustomer({
                customerId,
                closingDate: formatDate,
            });
        }
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.handleClosingDebt = handleClosingDebt;
//export excel
const exportDebtCustomer = async (req, res, next) => {
    const { targetDate } = req.query;
    try {
        await debtManagementService_1.debtManagementService.exportCustomerDebtSummaryToExcel(res, targetDate);
    }
    catch (error) {
        next(error);
    }
};
exports.exportDebtCustomer = exportDebtCustomer;
//=================================PAYMENT=======================================
const paymentDebtByCustomerId = async (req, res, next) => {
    const { customerId, amount, outboundSlipCodes } = req.body;
    try {
        if (!customerId) {
            throw appError_1.AppError.BadRequest("Cần truyền mã khách hàng khi chốt nợ thủ công", "MISSING_CUSTOMER_ID");
        }
        const response = await debtManagementService_1.debtManagementService.paymentDebtByCustomerId({
            customerId,
            amount,
            paymentMethod: "MANUAL",
            outboundSlipCodes,
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.paymentDebtByCustomerId = paymentDebtByCustomerId;
const importAmountPayment = async (req, res, next) => {
    try {
        if (!req.file) {
            throw appError_1.AppError.BadRequest("Vui lòng tải lên file Excel (.xlsx, .xls)", "FILE_REQUIRED");
        }
        const response = await debtManagementService_1.debtManagementService.importAmountPaymentFromExcel(req.file.buffer);
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.importAmountPayment = importAmountPayment;
const writeOffDebt = async (req, res, next) => {
    const { outboundSlipCode } = req.query;
    try {
        const response = await debtManagementService_1.debtManagementService.writeOffDebt(outboundSlipCode);
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.writeOffDebt = writeOffDebt;
//# sourceMappingURL=debtManagementController.js.map