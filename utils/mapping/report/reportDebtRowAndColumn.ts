import ExcelJS from "exceljs";
import { dayjsUtc } from "../../../assets/configs/dayjs/dayjs.config";
import { DebtDeductionRequest } from "../../../models/debt/debtDeductionRequest";

export const reportDebtDeductionColumns: Partial<ExcelJS.Column>[] = [
  { header: "STT", key: "index" },
  { header: "Tên Khách Hàng", key: "customerName" },
  { header: "Tên Công Ty", key: "companyName" },
  { header: "Ngày Yêu Cầu", key: "createdAt", style: { numFmt: "dd/mm/yyyy" } },
  { header: "Số Tiền Yêu Cầu", key: "amountRequested", style: { numFmt: "#,##0" } },
  { header: "Kiểu Thanh Toán", key: "paymentMethod" },
  { header: "Người Yêu Cầu", key: "requestedBy" },
  { header: "Người Duyệt", key: "approvedBy" },
  { header: "Khẩn Cấp?", key: "isUrgent" },
];

export const mapReportDebtDeductionRow = (item: DebtDeductionRequest, index: number) => {
  const formatPaymentMethod = (method: string) => {
    switch (method) {
      case "cash":
        return "Tiền Mặt";
      case "bank_transfer":
        return "Chuyển Khoản";
      default:
        return method;
    }
  };

  return {
    index: index + 1,
    customerName: item.Customer?.customerName || "",
    companyName: item.Customer?.companyName || "",
    createdAt: item.createdAt
      ? dayjsUtc(item.createdAt).tz("Asia/Ho_Chi_Minh").format("DD/MM/YYYY HH:mm")
      : "",
    amountRequested: item.amountRequested,
    paymentMethod: formatPaymentMethod(item.paymentMethod),
    requestedBy: item.requestedBy,
    approvedBy: item.approvedBy || "",
    isUrgent: item.isUrgent ? "Có" : "Không",
  };
};
