import { dayjsUtc } from "../../../assets/configs/dayjs/dayjs.config";
import {
  PlanAdherenceResult,
  ProductionReportItem,
  ReportAccumulator,
} from "../../../interface/synthetic/report.production.type";

export const VN_TZ = "Asia/Ho_Chi_Minh";

// Quy đổi ngày sang khung giờ sản xuất (06:00 hôm nay -> 05:59:59 sáng hôm sau)
export const getProductionDayBounds = (dateStr: string) => {
  const start = dayjsUtc.tz(`${dateStr} 06:00:00`, VN_TZ);

  return {
    startDateTime: start.toDate(),
    endDateTime: start.add(1, "day").subtract(1, "ms").toDate(),
  };
};

// Tính thời gian định mức tạo ra (Earned Standard Minutes - T_earned)
export const calculateEarnedMinutes = ({
  reportQty,
  runningPlan,
  plannedDuration,
  fallbackLength,
  fallbackSpeed,
}: {
  reportQty: number;
  runningPlan: number;
  plannedDuration?: number | null;
  fallbackLength?: number;
  fallbackSpeed?: number;
}): number => {
  if (runningPlan <= 0 || reportQty <= 0) return 0;

  if (plannedDuration && plannedDuration > 0) {
    const ratio = Math.min(1, reportQty / runningPlan);
    return Math.round(plannedDuration * ratio * 100) / 100;
  }

  if (fallbackLength && fallbackSpeed && fallbackSpeed > 0) {
    return Math.round((fallbackLength / fallbackSpeed) * 100) / 100;
  }

  return 0;
};

// Tính toán các chỉ số % Đạt kế hoạch
export const calculateAdherenceMetrics = ({
  totalPlannedMinutes = 0,
  totalEarnedMinutes = 0,
  totalActualMinutes = 0,
}: {
  totalPlannedMinutes?: number;
  totalEarnedMinutes?: number;
  totalActualMinutes?: number;
}): PlanAdherenceResult => {
  const fulfillmentRate =
    totalPlannedMinutes > 0
      ? Math.min(100, Math.round((totalEarnedMinutes / totalPlannedMinutes) * 10000) / 100)
      : 0;

  const timeAdherenceRate =
    totalActualMinutes > 0
      ? Math.round((totalEarnedMinutes / totalActualMinutes) * 10000) / 100
      : 0;

  return {
    totalPlannedMinutes: Math.round(totalPlannedMinutes * 100) / 100,
    totalEarnedMinutes: Math.round(totalEarnedMinutes * 100) / 100,
    totalActualMinutes: Math.round(totalActualMinutes * 100) / 100,
    fulfillmentRate,
    timeAdherenceRate,
  };
};

//  Khởi tạo đối tượng gom dữ liệu
export const createReportAccumulator = (key: string): ReportAccumulator => ({
  dimensionKey: key,
  totalPaperKg: 0,
  totalLength: 0,
  totalPrice: 0,
  totalDurations: 0,
  totalEarnedMinutes: 0,
  speedCount: 0,
  sumSpeed: 0,
  totalQcErrors: 0,
});

// Hàm dùng chung tích lũy dữ liệu cho cả Bảng Máy và Bảng Thợ
export const accumulateReportData = (
  acc: ReportAccumulator,
  data: {
    paperKg: number;
    length: number;
    price: number;
    duration: number;
    earnedMinutes: number;
    speed: number;
    qcErrors: number;
  },
) => {
  acc.totalPaperKg += data.paperKg;
  acc.totalLength += data.length;
  acc.totalPrice += data.price;
  acc.totalDurations += data.duration;
  acc.totalEarnedMinutes += data.earnedMinutes;
  acc.sumSpeed += data.speed;
  acc.speedCount += 1;
  acc.totalQcErrors += data.qcErrors;
};

//  Hàm dùng chung hoàn thiện dòng báo cáo
export const finalizeReportRow = (
  acc: ReportAccumulator,
  scrapKg: number,
  plannedMinutes?: number,
): ProductionReportItem => {
  const totalPaperTon = Math.round((acc.totalPaperKg / 1000) * 100) / 100;
  const totalScrapKg = Math.round(scrapKg * 100) / 100;

  // Bẫy chia 0: Suất phế Kg / Tấn giấy SD
  const scrapRate = totalPaperTon > 0 ? Math.round((totalScrapKg / totalPaperTon) * 100) / 100 : 0;

  // Tốc độ bình quân
  const averageSpeed =
    acc.speedCount > 0 ? Math.round((acc.sumSpeed / acc.speedCount) * 100) / 100 : 0;

  // Bẫy chia 0: Tỷ lệ lỗi / Tấn giấy
  const totalQcErrors = Math.round(acc.totalQcErrors);
  const qcErrorPerTon =
    totalPaperTon > 0 ? Math.round((totalQcErrors / totalPaperTon) * 100) / 100 : 0;

  // % Đạt kế hoạch
  const adherence = calculateAdherenceMetrics({
    totalPlannedMinutes: plannedMinutes ?? 0,
    totalEarnedMinutes: acc.totalEarnedMinutes,
    totalActualMinutes: acc.totalDurations,
  });

  return {
    dimensionKey: acc.dimensionKey,
    totalPaperTon,
    totalLength: Math.round(acc.totalLength * 100) / 100,
    totalScrapKg,
    scrapRate,
    averageSpeed,
    totalRevenue: Math.round(acc.totalPrice * 100) / 100,
    fulfillmentRate: adherence.fulfillmentRate,
    timeAdherenceRate: adherence.timeAdherenceRate,
    totalQcErrors: Math.round(acc.totalQcErrors),
    qcErrorPerTon,
  };
};
