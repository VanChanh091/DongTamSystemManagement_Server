"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentAllocationService = void 0;
const appError_1 = require("../../utils/appError");
const paymentAllocationRepository_1 = require("../../repository/paymentAllocationRepository");
const excelExporter_1 = require("../../utils/helper/excelExporter");
const paymentAllocation_1 = require("../../models/warehouse/payment/paymentAllocation");
const reportPaymentAllocationRowAndColumn_1 = require("../../utils/mapping/report/reportPaymentAllocationRowAndColumn");
exports.paymentAllocationService = {
    getPaymentAlocationHistory: async ({ outboundId }) => {
        try {
            if (!outboundId) {
                throw appError_1.AppError.BadRequest("Thiếu mã phiếu xuất kho", "MISSING_OUTBOUND_ID");
            }
            const result = await paymentAllocationRepository_1.paymentAllocationRepository.getOutboundAllocationHistory(outboundId);
            if (!result) {
                throw appError_1.AppError.NotFound("Không tìm thấy thông tin phiếu xuất kho", "OUTBOUND_NOT_FOUND");
            }
            return { message: "Lấy lịch sử cấn trừ của phiếu thành công", data: result };
        }
        catch (error) {
            console.error("get outbound allocation history failed", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    exportExcelPaymentAllocations: async ({ res, fromDate, toDate, username, }) => {
        const baseQuery = paymentAllocationRepository_1.paymentAllocationRepository.buildAllocationQuery({
            isExport: true,
            fromDate,
            toDate,
        });
        await (0, excelExporter_1.exportExcelStreamResponse)(res, {
            baseQuery,
            model: paymentAllocation_1.PaymentAllocation,
            sheetName: "Lịch sử cấn trừ công nợ",
            fileName: "history_payment_allocation",
            columns: reportPaymentAllocationRowAndColumn_1.reportPaymentAllocationColumns,
            rows: reportPaymentAllocationRowAndColumn_1.mapReportPaymentAllocationRow,
            userName: username,
        });
    },
};
//# sourceMappingURL=paymentAllocationService.js.map