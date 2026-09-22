//synthetic err production
//======================= ERROR MONTHLY ==========================
export interface MonthlyErrorReportInput {
  month: number;
  year: number;
  machine?: string;
  employeeId?: number | "all";
  type: "paper" | "box";
}

export interface MonthlyErrorReportRow {
  machine: string;
  employeeName: string;
  dailyErrors: Record<number, number>; // { 1: 0, 2: 5, ..., 31: 2 }
  totalErrors: number; // Tổng số lỗi trong tháng
}

export interface MonthlyErrorReportResponse {
  message: string;
  daysInMonth: number;
  summary: {
    totalError: number; // Tổng số lỗi trong tháng
    dailyTotals: Record<number, number>; // Dòng chân trang: Tổng số lỗi theo từng ngày (1..31)
  };
  data: MonthlyErrorReportRow[];
}

//======================= ERROR YEARLY ==========================
export interface YearlyErrorReportInput {
  year: number;
  machine?: string;
  employeeId?: number | "all";
  type: "paper" | "box";
}

export interface ErrorStatMetric {
  errorCount: number; // Số lần tiêu chí lỗi này bị false
  tonnage: number; // Tổng sản lượng giấy trong phạm vi (Đơn vị: Tấn)
  errorRate: number; // Tỉ lệ lỗi = (errorCount / tonnage) * 1000, làm tròn 2 chữ số thập phân
}

export interface YearlyErrorReportRow {
  criteriaCode: string;
  criteriaName: string;
  monthlyMetrics: Record<number, ErrorStatMetric>; // { 1: {...}, 2: {...}, ..., 12: {...} }
  totalMetrics: ErrorStatMetric; // Tổng hợp cả năm
}

export interface YearlyErrorReportResponse {
  message: string;
  summary: {
    totalTonnage: number; // Tổng sản lượng giấy trong năm (tấn)
    totalErrorCount: number; // Tổng số lần xuất hiện lỗi trong năm
    totalErrorRate: number; // Tỷ lệ lỗi chung cả năm (số lỗi / tấn * 1000)
    monthlyMetrics: Record<number, ErrorStatMetric>; // Tổng hợp riêng từng tháng (1 -> 12) phục vụ UI
  };
  data: YearlyErrorReportRow[];
}
