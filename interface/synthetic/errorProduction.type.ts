//synthetic err production
export interface DailyErrorReportInput {
  month: number;
  year: number;
  machine?: string;
  employeeId?: number | "all";
  type: "paper" | "box";
}

export interface DailyErrorReportRow {
  machine: string;
  employeeName: string;
  dailyErrors: Record<number, number>; // { 1: 0, 2: 5, ..., 31: 2 }
  totalErrors: number; // Tổng số lỗi trong tháng
}

export interface DailyErrorReportResponse {
  message: string;
  daysInMonth: number;
  summary: {
    totalError: number; // Tổng số lỗi trong tháng
    dailyTotals: Record<number, number>; // Dòng chân trang: Tổng số lỗi theo từng ngày (1..31)
  };
  data: DailyErrorReportRow[];
}
