import ExcelJS from "exceljs";

export const debtCustomerColumns: Partial<ExcelJS.Column>[] = [
  { header: "STT", key: "index" },
  { header: "Mã Khách Hàng", key: "customerId" },
  { header: "Tên Khách Hàng", key: "customerName" },
  { header: "Số Đơn Chưa TT", key: "unpaidOutboundCount" },
  { header: "Tổng Nợ", key: "totalDebt", style: { numFmt: "#,##0" } },

  // Nợ trong hạn
  { header: "Nợ Trong Hạn", key: "notDueDebt", style: { numFmt: "#,##0" } },
  { header: "Nợ Chưa Chốt", key: "currentPeriodDebt", style: { numFmt: "#,##0" } },
  { header: "Nợ Đã Chốt", key: "closedDebt", style: { numFmt: "#,##0" } },
  { header: "Sắp Tới Hạn", key: "dueIn1_3", style: { numFmt: "#,##0" } },

  // Nợ quá hạn
  { header: "1-30 Ngày", key: "overdue1_30", style: { numFmt: "#,##0" } },
  { header: "31-60 Ngày", key: "overdue31_60", style: { numFmt: "#,##0" } },
  { header: "61-90 Ngày", key: "overdue61_90", style: { numFmt: "#,##0" } },
  { header: "91-120 Ngày", key: "overdue91_120", style: { numFmt: "#,##0" } },
  { header: "Trên 120 Ngày", key: "overdueOver120", style: { numFmt: "#,##0" } },
  { header: "Tổng Quá Hạn", key: "dueDebt", style: { numFmt: "#,##0" } },
];

export const mappingDebtCustomerRow = (item: any, index: number) => {
  return {
    index: index + 1,
    customerId: item.customerId,
    customerName: item.customerName,
    totalDebt: item.totalDebt,

    // Nợ trong hạn
    notDueDebt: item.notDueDebt,
    currentPeriodDebt: item.currentPeriodDebt,
    closedDebt: item.closedDebt,
    dueIn1_3: item.aging.dueIn1_3,

    // Nợ quá hạn
    overdue1_30: item.aging.overdue1_30,
    overdue31_60: item.aging.overdue31_60,
    overdue61_90: item.aging.overdue61_90,
    overdue91_120: item.aging.overdue91_120,
    overdueOver120: item.aging.overdueOver120,
    dueDebt: item.overdueDebt,
  };
};
