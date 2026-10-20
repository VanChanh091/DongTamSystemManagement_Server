export interface PlanAdherenceResult {
  totalPlannedMinutes: number;
  totalEarnedMinutes: number;
  totalActualMinutes: number;
  fulfillmentRate: number;
  timeAdherenceRate: number;
}

export interface ProductionReportItem {
  dimensionKey: string; // Tên Máy hoặc Tên Thợ
  totalPaperTon: number; // 1. Số tấn giấy SD (đã phân bổ pro-rata)
  totalLength: number; // 2. Số mét chạy được
  totalScrapKg: number; // 3. Số kg phế
  scrapRate: number; // --. % Phế (Kg phế / Tấn giấy SD)
  averageSpeed: number; // --. Tốc độ máy TB (m/phút)
  totalRevenue: number; // --. Tổng doanh số (VNĐ)
  fulfillmentRate?: number; // --. % Đạt KH Khối lượng (chỉ Bảng Máy)
  timeAdherenceRate?: number; // --. % Đạt KH Thời gian/tốc độ (Bảng Máy & Thợ)
  totalQcErrors: number; // 4. Số lỗi QC
  qcErrorPerTon: number; // --. % Lỗi / Tấn giấy
}

export interface ReportAccumulator {
  dimensionKey: string;
  totalPaperKg: number;
  totalLength: number;
  totalPrice: number;
  totalDurations: number;
  totalEarnedMinutes: number;
  speedCount: number;
  sumSpeed: number;
  totalQcErrors: number;
}
