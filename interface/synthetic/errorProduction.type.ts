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

// Chỉ số thống kê theo từng mốc (tháng hoặc cả năm)
export interface ErrorStatMetric {
  errorCount: number; // Tổng số lỗi phát sinh
  tonnage: number; // Sản lượng giấy (Đơn vị: Tấn)
  errorRate: number; // Tỉ lệ lỗi (Số lỗi / Tấn), làm tròn 2-3 chữ số thập phân
}

export interface YearlyErrorReportRow {
  machine: string;
  employeeName: string;
  monthlyMetrics: Record<number, ErrorStatMetric>; // { 1: {...}, 2: {...}, ..., 12: {...} }
  totalMetrics: ErrorStatMetric; // Tổng hợp cả năm
}

export interface YearlyErrorReportResponse {
  message: string;
  year: number;
  summary: {
    totalError: number; // Tổng số lỗi trong năm
    totalTonnage: number; // Tổng sản lượng giấy trong năm
    averageErrorRate: number; // Tỉ lệ lỗi trung bình trong năm
  };
  data: YearlyErrorReportRow[];
}
