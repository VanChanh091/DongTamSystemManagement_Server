"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReportCacheTTL = exports.productionReportService = void 0;
const appError_1 = require("../../../utils/appError");
const productionReportRepository_1 = require("../../../repository/productionReportRepository");
const productionReportHelper_1 = require("../../../utils/helper/modelHelper/productionReportHelper");
const dayjs_config_1 = require("../../../assets/configs/dayjs/dayjs.config");
const cacheKey_1 = require("../../../utils/helper/cache/cacheKey");
const redis_connect_1 = __importDefault(require("../../../assets/configs/connect/redis.connect"));
const devEnvironment = process.env.NODE_ENV !== "production";
const { reports } = cacheKey_1.CacheKey.synthetic;
const VN_TZ = "Asia/Ho_Chi_Minh";
const TIMETTL = 7 * 24 * 60 * 60; // 7 ngày
const CACHETTL = 300; // 5 phút
exports.productionReportService = {
    getReportProduction: async ({ startDate, endDate, }) => {
        try {
            const finalEndDate = endDate || startDate;
            const { startDateTime } = (0, productionReportHelper_1.getProductionDayBounds)(startDate);
            const { endDateTime } = (0, productionReportHelper_1.getProductionDayBounds)(finalEndDate);
            const cacheKey = reports.report_production(startDate, finalEndDate);
            const cached = await redis_connect_1.default.get(cacheKey);
            if (cached) {
                if (devEnvironment)
                    console.log("✅ Data Report Paper Production from Redis");
                return {
                    message: "Lấy báo cáo sản xuất từ cache",
                    data: JSON.parse(cached),
                };
            }
            // Lấy dữ liệu báo cáo vận hành gốc
            const reportPapers = await productionReportRepository_1.productionReportRepository.getProductionReportPapers({
                startDateTime,
                endDateTime,
            });
            if (!reportPapers || reportPapers.length === 0) {
                const emptyData = {
                    machines: [],
                    workers: [],
                };
                return {
                    message: "Không có dữ liệu trong khoảng thời gian đã chọn",
                    data: emptyData,
                };
            }
            // map planningId để lấy định mức giấy, phế liệu, lỗi QC
            const planningIds = [...new Set(reportPapers.map((r) => r.planningId))];
            // gọi song song các query
            const [paperReqs, scrapData, qcErrors, dayPlannings] = await Promise.all([
                productionReportRepository_1.productionReportRepository.getPaperRequirementsByPlanningIds(planningIds),
                productionReportRepository_1.productionReportRepository.getScrapReportsByDateRange({ startDateTime, endDateTime }),
                productionReportRepository_1.productionReportRepository.getQcErrorsByPlanningIds(planningIds),
                productionReportRepository_1.productionReportRepository.getMachinePlannedDurations({
                    startDate,
                    endDate: finalEndDate,
                }),
            ]);
            // Mapping tra cứu định mức giấy
            const paperReqMap = new Map();
            paperReqs.forEach((item) => {
                const cur = paperReqMap.get(item.planningId) || 0;
                paperReqMap.set(item.planningId, cur + Number(item.totalRequiredQty || 0));
            });
            // Phân bổ lỗi QC chính xác cho từng reportPaper
            // Mỗi lỗi QC chỉ thuộc về duy nhất 1 reportPaper (tránh gán trùng khi planning có nhiều thợ/ca)
            const reportQcMap = new Map();
            for (const qc of qcErrors) {
                const candidateReports = reportPapers.filter((r) => r.planningId === qc.planningId);
                if (candidateReports.length === 1) {
                    const repId = candidateReports[0].reportPaperId;
                    reportQcMap.set(repId, (reportQcMap.get(repId) || 0) + 1);
                }
                else if (candidateReports.length > 1) {
                    const qcTime = new Date(qc.timeInspection).getTime();
                    let bestReport = candidateReports[0];
                    let minDiff = Math.abs(new Date(bestReport.dayReport).getTime() - qcTime);
                    for (let i = 1; i < candidateReports.length; i++) {
                        const diff = Math.abs(new Date(candidateReports[i].dayReport).getTime() - qcTime);
                        if (diff < minDiff) {
                            minDiff = diff;
                            bestReport = candidateReports[i];
                        }
                    }
                    reportQcMap.set(bestReport.reportPaperId, (reportQcMap.get(bestReport.reportPaperId) || 0) + 1);
                }
            }
            const machineScrapMap = new Map();
            const workerScrapMap = new Map();
            scrapData.forEach((s) => {
                const qty = Number(s.totalQtyScrap || 0);
                if (s.machine) {
                    machineScrapMap.set(s.machine, (machineScrapMap.get(s.machine) || 0) + qty);
                }
                if (s.reportedBy) {
                    workerScrapMap.set(s.reportedBy, (workerScrapMap.get(s.reportedBy) || 0) + qty);
                }
            });
            const machinePlannedMinutesMap = new Map();
            dayPlannings.forEach((p) => {
                const m = p.chooseMachine;
                machinePlannedMinutesMap.set(m, (machinePlannedMinutesMap.get(m) || 0) + (Number(p.plannedDuration) || 0));
            });
            // Gom nhóm dữ liệu đồng thời cho Máy và Thợ
            const machineGroupMap = new Map();
            const workerGroupMap = new Map();
            let totalAllPaperKg = 0;
            for (const report of reportPapers) {
                const planning = report.PlanningPaper;
                const runningPlan = Number(planning?.runningPlan || 0);
                const reportQty = Number(report.qtyProduced || 0);
                const proRataRatio = runningPlan > 0 ? reportQty / runningPlan : 0;
                const totalReqKg = paperReqMap.get(report.planningId) || 0;
                const usedKg = totalReqKg * proRataRatio;
                totalAllPaperKg += usedKg;
                const earnedMinutes = (0, productionReportHelper_1.calculateEarnedMinutes)({
                    reportQty,
                    runningPlan,
                    plannedDuration: planning?.plannedDuration,
                    fallbackLength: Number(report.totalLength || 0),
                    fallbackSpeed: Number(report.averageSpeed || 0),
                });
                const reportQcErrors = reportQcMap.get(report.reportPaperId) || 0;
                // 1. Gom theo Máy
                const machineKey = planning?.chooseMachine || "Chưa xác định";
                if (!machineGroupMap.has(machineKey)) {
                    machineGroupMap.set(machineKey, (0, productionReportHelper_1.createReportAccumulator)(machineKey));
                }
                (0, productionReportHelper_1.accumulateReportData)(machineGroupMap.get(machineKey), {
                    paperKg: usedKg,
                    length: Number(report.totalLength || 0),
                    price: Number(report.totalPrice || 0),
                    duration: Number(report.durations || 0),
                    earnedMinutes,
                    speed: Number(report.averageSpeed || 0),
                    qcErrors: reportQcErrors,
                });
                // 2. Gom theo Thợ
                const workerKey = report.shiftManagement || "Chưa xác định";
                if (!workerGroupMap.has(workerKey)) {
                    workerGroupMap.set(workerKey, (0, productionReportHelper_1.createReportAccumulator)(workerKey));
                }
                (0, productionReportHelper_1.accumulateReportData)(workerGroupMap.get(workerKey), {
                    paperKg: usedKg,
                    length: Number(report.totalLength || 0),
                    price: Number(report.totalPrice || 0),
                    duration: Number(report.durations || 0),
                    earnedMinutes,
                    speed: Number(report.averageSpeed || 0),
                    qcErrors: reportQcErrors,
                });
            }
            // Tạo danh sách báo cáo Máy
            const machineRows = [];
            for (const [key, data] of machineGroupMap.entries()) {
                const scrap = machineScrapMap.get(key) || 0;
                const plannedMin = machinePlannedMinutesMap.get(key) || 0;
                machineRows.push((0, productionReportHelper_1.finalizeReportRow)(data, scrap, plannedMin));
            }
            // Tạo danh sách báo cáo Thợ
            const workerRows = [];
            for (const [key, data] of workerGroupMap.entries()) {
                const scrap = workerScrapMap.get(key) || 0;
                workerRows.push((0, productionReportHelper_1.finalizeReportRow)(data, scrap, undefined));
            }
            // Cân bằng làm tròn tổng tấn giấy (tránh lệch 0.01 do rounding giữa 2 bảng)
            const totalTargetPaperTon = Math.round((totalAllPaperKg / 1000) * 100) / 100;
            const reconcileTon = (rows) => {
                const currentSum = Math.round(rows.reduce((s, r) => s + r.totalPaperTon, 0) * 100) / 100;
                const diff = Math.round((totalTargetPaperTon - currentSum) * 100) / 100;
                if (diff !== 0 && rows.length > 0) {
                    const maxRow = rows.reduce((max, r) => (r.totalPaperTon > max.totalPaperTon ? r : max), rows[0]);
                    maxRow.totalPaperTon = Math.round((maxRow.totalPaperTon + diff) * 100) / 100;
                }
            };
            reconcileTon(machineRows);
            reconcileTon(workerRows);
            const resultData = {
                machines: machineRows,
                workers: workerRows,
            };
            // Lưu vào cache
            const ttl = (0, exports.getReportCacheTTL)(finalEndDate);
            await redis_connect_1.default.set(cacheKey, JSON.stringify(resultData), "EX", ttl);
            return {
                message: "Lấy báo cáo sản xuất công đoạn 1 thành công",
                data: resultData,
            };
        }
        catch (error) {
            console.error("❌ Lỗi tính báo cáo sản xuất công đoạn 1:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
};
const getReportCacheTTL = (finalEndDate) => {
    const { endDateTime } = (0, productionReportHelper_1.getProductionDayBounds)(finalEndDate);
    const now = (0, dayjs_config_1.dayjsUtc)().tz(VN_TZ).toDate();
    // Đã đóng ca sản xuất hoàn toàn
    if (now > endDateTime)
        return TIMETTL;
    // Đang trong ngày sản xuất hiện tại
    return CACHETTL;
};
exports.getReportCacheTTL = getReportCacheTTL;
//# sourceMappingURL=productionReportService.js.map