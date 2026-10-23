"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.finalizeReportRow = exports.accumulateReportData = exports.createReportAccumulator = exports.calculateAdherenceMetrics = exports.calculateEarnedMinutes = exports.getProductionDayBounds = exports.VN_TZ = void 0;
const dayjs_config_1 = require("../../../assets/configs/dayjs/dayjs.config");
exports.VN_TZ = "Asia/Ho_Chi_Minh";
// Quy đổi ngày sang khung giờ sản xuất (06:00 hôm nay -> 05:59:59 sáng hôm sau)
const getProductionDayBounds = (dateStr) => {
    const start = dayjs_config_1.dayjsUtc.tz(`${dateStr} 06:00:00`, exports.VN_TZ);
    return {
        startDateTime: start.toDate(),
        endDateTime: start.add(1, "day").subtract(1, "ms").toDate(),
    };
};
exports.getProductionDayBounds = getProductionDayBounds;
// Tính thời gian định mức tạo ra (Earned Standard Minutes - T_earned)
const calculateEarnedMinutes = ({ reportQty, runningPlan, plannedDuration, fallbackLength, fallbackSpeed, }) => {
    if (runningPlan <= 0 || reportQty <= 0)
        return 0;
    if (plannedDuration && plannedDuration > 0) {
        const ratio = Math.min(1, reportQty / runningPlan);
        return Math.round(plannedDuration * ratio * 100) / 100;
    }
    if (fallbackLength && fallbackSpeed && fallbackSpeed > 0) {
        return Math.round((fallbackLength / fallbackSpeed) * 100) / 100;
    }
    return 0;
};
exports.calculateEarnedMinutes = calculateEarnedMinutes;
// Tính toán các chỉ số % Đạt kế hoạch
const calculateAdherenceMetrics = ({ totalPlannedMinutes = 0, totalEarnedMinutes = 0, totalActualMinutes = 0, }) => {
    const fulfillmentRate = totalPlannedMinutes > 0
        ? Math.min(100, Math.round((totalEarnedMinutes / totalPlannedMinutes) * 10000) / 100)
        : 0;
    const timeAdherenceRate = totalActualMinutes > 0
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
exports.calculateAdherenceMetrics = calculateAdherenceMetrics;
//  Khởi tạo đối tượng gom dữ liệu
const createReportAccumulator = (key) => ({
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
exports.createReportAccumulator = createReportAccumulator;
// Hàm dùng chung tích lũy dữ liệu cho cả Bảng Máy và Bảng Thợ
const accumulateReportData = (acc, data) => {
    acc.totalPaperKg += data.paperKg;
    acc.totalLength += data.length;
    acc.totalPrice += data.price;
    acc.totalDurations += data.duration;
    acc.totalEarnedMinutes += data.earnedMinutes;
    acc.sumSpeed += data.speed;
    acc.speedCount += 1;
    acc.totalQcErrors += data.qcErrors;
};
exports.accumulateReportData = accumulateReportData;
//  Hàm dùng chung hoàn thiện dòng báo cáo
const finalizeReportRow = (acc, scrapKg, plannedMinutes) => {
    const totalPaperTon = Math.round((acc.totalPaperKg / 1000) * 100) / 100;
    const totalScrapKg = Math.round(scrapKg * 100) / 100;
    // % Phế liệu = (Kg phế / (Tấn giấy SD * 1000)) * 100 = Kg phế / (Tấn giấy SD * 10)
    const scrapRate = totalPaperTon > 0 ? Math.round((totalScrapKg / (totalPaperTon * 10)) * 1000) / 1000 : 0;
    // Tốc độ bình quân thực tế (mét/phút) = Tổng mét chạy / Tổng thời gian máy chạy
    const averageSpeed = acc.totalDurations > 0
        ? Math.round((acc.totalLength / acc.totalDurations) * 100) / 100
        : acc.speedCount > 0
            ? Math.round((acc.sumSpeed / acc.speedCount) * 100) / 100
            : 0;
    // Bẫy chia 0: % Lỗi / Tấn giấy (nhân 100 để ra tỷ lệ %)
    const totalQcErrors = Math.round(acc.totalQcErrors);
    const qcErrorPerTon = totalPaperTon > 0 ? Math.round(((totalQcErrors / totalPaperTon) * 100) * 100) / 100 : 0;
    // % Đạt kế hoạch
    const adherence = (0, exports.calculateAdherenceMetrics)({
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
exports.finalizeReportRow = finalizeReportRow;
//# sourceMappingURL=productionReportHelper.js.map