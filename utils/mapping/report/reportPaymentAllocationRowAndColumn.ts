import ExcelJS from "exceljs";
import { dayjsUtc } from "../../../assets/configs/dayjs/dayjs.config";

export const reportPaymentAllocationColumns: Partial<ExcelJS.Column>[] = [
  { header: "STT", key: "index", width: 8 },
  { header: "Ngày Phân Bổ", key: "createdAt", width: 20 },
  { header: "Mã Khách Hàng", key: "customerId", width: 16 },
  { header: "Tên Khách Hàng", key: "customerName", width: 28 },
  { header: "Mã Phiếu Xuất Kho", key: "outboundSlipCode", width: 22 },
  { header: "Số Tiền Cấn Trừ", key: "amountAllocation", width: 18, style: { numFmt: "#,##0" } },
  { header: "Nguồn Cấn Trừ", key: "paymentMethod", width: 18 },
  { header: "Mã Yêu Cầu Duyệt", key: "requestId", width: 18 },
];

export const mapReportPaymentAllocationRow = (item: any, index: number) => {
  const formatMethod = (method: string) => {
    switch (method) {
      case "IMPORT":
        return "Import Excel";
      case "MANUAL":
        return item.requestId ? "Yêu Cầu Cấn Trừ" : "Thủ Công";
      case "bank_transfer":
        return "Chuyển Khoản";
      case "cash":
        return "Tiền Mặt";
      default:
        return method;
    }
  };

  return {
    index: index + 1,
    createdAt: item.createdAt
      ? dayjsUtc(item.createdAt).tz("Asia/Ho_Chi_Minh").format("DD/MM/YYYY HH:mm")
      : "",
    customerId: item.customerId || item.Customer?.customerId || "",
    customerName: item.Customer?.customerName || item.Customer?.companyName || "",
    outboundSlipCode: item.outbound?.outboundSlipCode || "",
    amountAllocation: item.amountAllocation || 0,
    paymentMethod: formatMethod(item.paymentMethod),
    requestId: item.requestId ? `#REQ-${item.requestId}` : "—",
  };
};
