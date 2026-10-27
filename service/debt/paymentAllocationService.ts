import { Response } from "express";
import { AppError } from "../../utils/appError";
import { paymentAllocationRepository } from "../../repository/paymentAllocationRepository";
import { exportExcelStreamResponse } from "../../utils/helper/excelExporter";
import { PaymentAllocation } from "../../models/warehouse/payment/paymentAllocation";
import {
  mapReportPaymentAllocationRow,
  reportPaymentAllocationColumns,
} from "../../utils/mapping/report/reportPaymentAllocationRowAndColumn";

export const paymentAllocationService = {
  getPaymentAlocationHistory: async ({ outboundId }: { outboundId: number }) => {
    try {
      if (!outboundId) {
        throw AppError.BadRequest("Thiếu mã phiếu xuất kho", "MISSING_OUTBOUND_ID");
      }

      const result = await paymentAllocationRepository.getOutboundAllocationHistory(outboundId);
      if (!result) {
        throw AppError.NotFound("Không tìm thấy thông tin phiếu xuất kho", "OUTBOUND_NOT_FOUND");
      }

      return { message: "Lấy lịch sử cấn trừ của phiếu thành công", data: result };
    } catch (error) {
      console.error("get outbound allocation history failed", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  exportExcelPaymentAllocations: async ({
    res,
    fromDate,
    toDate,
    username,
  }: {
    res: Response;
    fromDate: string | Date;
    toDate: string | Date;
    username: string;
  }) => {
    const baseQuery = paymentAllocationRepository.buildAllocationQuery({
      isExport: true,
      fromDate,
      toDate,
    });

    await exportExcelStreamResponse(res, {
      baseQuery,
      model: PaymentAllocation,
      sheetName: "Lịch sử cấn trừ công nợ",
      fileName: "history_payment_allocation",
      columns: reportPaymentAllocationColumns,
      rows: mapReportPaymentAllocationRow,
      userName: username,
    });
  },
};
