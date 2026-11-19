"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.actionPlanService = void 0;
const actionPlanRepository_1 = require("../../repository/admin/actionPlanRepository");
const actionPlanTarget_1 = require("../../models/admin/actionPlan/actionPlanTarget");
const actionPlanDebtSnapshot_1 = require("../../models/admin/actionPlan/actionPlanDebtSnapshot");
const dayjs_config_1 = require("../../assets/configs/dayjs/dayjs.config");
const actionPlanHelper_1 = require("../../utils/helper/modelHelper/actionPlanHelper");
const core_debt_helper_1 = require("../../utils/helper/core_debt_helper");
const cacheKey_1 = require("../../utils/helper/cache/cacheKey");
const redis_connect_1 = __importDefault(require("../../assets/configs/connect/redis.connect"));
const devEnvironment = process.env.NODE_ENV !== "production";
const { actionPlan } = cacheKey_1.CacheKey.synthetic;
const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const TIMETTL = 7 * 24 * 60 * 60; // 7 ngày
const CACHETTL = 15 * 60; // 30 phút
exports.actionPlanService = {
    getYearlyActionPlan: async ({ year }) => {
        // Kiểm tra xem có phải là năm cũ hay không
        const cacheKey = actionPlan.yearly(year);
        const cachedData = await redis_connect_1.default.get(cacheKey);
        if (cachedData) {
            if (devEnvironment)
                console.log("✅ Data action plan from Redis cache");
            return JSON.parse(cachedData);
        }
        const dateHelpers = (0, actionPlanHelper_1.createVnDateHelpers)(year);
        const startOfYear = dayjs_config_1.dayjsUtc.tz(`${year}-01-01 00:00:00`, dayjs_config_1.VN_TZ).toDate();
        const endOfYear = dayjs_config_1.dayjsUtc.tz(`${year}-12-31 23:59:59.999`, dayjs_config_1.VN_TZ).toDate();
        const startOfYearDateOnly = `${year}-01-01`;
        const endOfYearDateOnly = `${year}-12-31`;
        const nowMs = Date.now();
        // Truy vấn song song
        const [targets, outbounds, planningRows, prodReports, debtSnapshots] = await Promise.all([
            actionPlanRepository_1.actionPlanRepository.getTargetsByYear(year),
            actionPlanRepository_1.actionPlanRepository.getOutboundsForYear(startOfYear, endOfYear),
            actionPlanRepository_1.actionPlanRepository.getPlanningPapersForYear(startOfYear, endOfYear),
            actionPlanRepository_1.actionPlanRepository.getDailyReportPerformanceForYear(startOfYearDateOnly, endOfYearDateOnly),
            actionPlanRepository_1.actionPlanRepository.getDebtSnapshotsByYear(year),
        ]);
        const targetMap = new Map(targets.map((t) => [Number(t.month), t]));
        const result = {
            year,
            salesTable: buildSalesTable(outbounds, targetMap, dateHelpers),
            debtTable: buildDebtTable(debtSnapshots, targetMap),
            planningTable: buildPlanningTable(planningRows, targetMap, dateHelpers, year, nowMs),
            prodTable: buildProductionTable(planningRows, prodReports, targetMap, dateHelpers, startOfYear.getTime(), endOfYear.getTime()),
        };
        // Lưu kết quả vào Redis cache
        const currentVnYear = dayjs_config_1.dayjsUtc.tz(new Date(), dayjs_config_1.VN_TZ).year();
        const ttl = year < currentVnYear ? TIMETTL : CACHETTL;
        await redis_connect_1.default.set(cacheKey, JSON.stringify(result), "EX", ttl);
        return result;
    },
    // Lưu hoặc cập nhật cấu hình mục tiêu 12 tháng
    saveYearlyTargets: async ({ year, targetsList, updatedBy, }) => {
        const rows = targetsList.map((item) => ({
            year,
            month: item.month,
            targetRevenue: item.targetRevenue ?? 0,
            targetDebtOnTimeRate: item.targetDebtOnTimeRate ?? 0,
            targetOrderOnTimeRate: item.targetOrderOnTimeRate ?? 0,
            targetProductionCompletionRate: item.targetProductionCompletionRate ?? 0,
            note: item.note ?? null,
            updatedBy: updatedBy ?? null,
        }));
        await actionPlanTarget_1.ActionPlanTarget.bulkCreate(rows, {
            updateOnDuplicate: [
                "targetRevenue",
                "targetDebtOnTimeRate",
                "targetOrderOnTimeRate",
                "targetProductionCompletionRate",
                "note",
                "updatedBy",
            ],
        });
        // Xóa cache để lượt xem kế hoạch tiếp theo tải dữ liệu mục tiêu mới nhất
        await redis_connect_1.default.del(actionPlan.yearly(year));
        return { message: "Lưu mục tiêu kế hoạch thành công" };
    },
    // Chụp snapshot công nợ (hỗ trợ cả cronjob tự động và chốt thủ công từ API)
    captureDebtSnapshot: async ({ snapshotDate = new Date(), year, month, closingDay, isCron = false, } = {}) => {
        const vnTime = dayjs_config_1.dayjsUtc.tz(snapshotDate, dayjs_config_1.VN_TZ);
        const actualDay = vnTime.date();
        // Nếu chạy tự động từ cronjob: chỉ chạy vào ngày 1 hoặc 15
        if (isCron && actualDay !== 1 && actualDay !== 15) {
            return { message: "Hôm nay không phải ngày chốt công nợ (1 hoặc 15)" };
        }
        const targetYear = year ?? vnTime.year();
        const targetMonth = month ?? vnTime.month() + 1;
        const targetClosingDay = closingDay
            ? Number(closingDay)
            : actualDay === 1 || actualDay === 15
                ? actualDay
                : actualDay < 15
                    ? 1
                    : 15;
        const summary = await (0, actionPlanHelper_1.getGrandDebtSummary)({
            targetDate: typeof snapshotDate === "string" ? new Date(snapshotDate) : snapshotDate,
        });
        await actionPlanDebtSnapshot_1.ActionPlanDebtSnapshot.upsert({
            year: targetYear,
            month: targetMonth,
            closingDay: targetClosingDay,
            snapshotDate: vnTime.toDate(),
            totalDebt: summary.totalDebt,
            overdueDebt: summary.overdueDebt,
            onTimeDebt: summary.onTimeDebt,
            onTimeRate: summary.onTimeRate,
            customerCount: summary.customerCount,
        });
        // Xóa cache của năm tương ứng để cập nhật số liệu công nợ tức thì
        await redis_connect_1.default.del(actionPlan.yearly(targetYear));
        return {
            message: `Đã lưu snapshot công nợ kỳ ngày ${targetClosingDay}/${targetMonth}/${targetYear}`,
            data: {
                year: targetYear,
                month: targetMonth,
                closingDay: targetClosingDay,
                snapshotDate: vnTime.format("YYYY-MM-DD"),
                totalDebt: summary.totalDebt,
                overdueDebt: summary.overdueDebt,
                onTimeDebt: summary.onTimeDebt,
                onTimeRate: summary.onTimeRate,
                customerCount: summary.customerCount,
            },
        };
    },
};
// bảng bán hàng
const buildSalesTable = (outbounds, targetMap, { getVnMonthIndex }) => {
    const actualRevenueByMonth = new Array(12).fill(0);
    for (let i = 0; i < outbounds.length; i++) {
        const ob = outbounds[i];
        if (!ob.dateOutbound)
            continue;
        const mIdx = getVnMonthIndex(ob.dateOutbound);
        if (mIdx >= 0 && mIdx <= 11) {
            actualRevenueByMonth[mIdx] += Number(ob.totalPricePayment) || 0;
        }
    }
    const targetMonthly = MONTHS.map((m) => Number(targetMap.get(m)?.targetRevenue) || 0);
    const actualMonthly = MONTHS.map((m) => Math.round(actualRevenueByMonth[m - 1]));
    const rateMonthly = MONTHS.map((_, idx) => {
        const tgt = targetMonthly[idx];
        return tgt > 0 ? (0, core_debt_helper_1.round2)((actualMonthly[idx] / tgt) * 100) : null;
    });
    const sumTarget = targetMonthly.reduce((a, b) => a + b, 0);
    const sumActual = actualMonthly.reduce((a, b) => a + b, 0);
    const sumRate = sumTarget > 0 ? (0, core_debt_helper_1.round2)((sumActual / sumTarget) * 100) : null;
    return {
        targetRevenue: { sum: sumTarget, months: targetMonthly },
        actualRevenue: { sum: sumActual, months: actualMonthly },
        achievementRate: { sum: sumRate, months: rateMonthly },
    };
};
// bảng thu nợ
const buildDebtTable = (debtSnapshots, targetMap) => {
    const debtMap = new Map();
    for (let i = 0; i < debtSnapshots.length; i++) {
        const s = debtSnapshots[i];
        if (!debtMap.has(s.month) || Number(s.closingDay) === 15) {
            debtMap.set(Number(s.month), {
                totalDebt: Number(s.totalDebt) || 0,
                overdueDebt: Number(s.overdueDebt) || 0,
                onTimeRate: Number(s.onTimeRate) || 0,
            });
        }
    }
    const totalDebtMonthly = MONTHS.map((m) => debtMap.get(m)?.totalDebt ?? null);
    const overdueDebtMonthly = MONTHS.map((m) => debtMap.get(m)?.overdueDebt ?? null);
    const targetRateMonthly = MONTHS.map((m) => Number(targetMap.get(m)?.targetDebtOnTimeRate) || 0);
    const actualRateMonthly = MONTHS.map((m) => debtMap.get(m)?.onTimeRate ?? null);
    const latestMonth = [...MONTHS].reverse().find((m) => debtMap.has(m));
    const latestDebt = latestMonth ? debtMap.get(latestMonth) : null;
    const sumTargetRate = (0, actionPlanHelper_1.calcAvgTarget)(targetRateMonthly);
    const sumActualRate = latestDebt?.onTimeRate ?? null;
    const { diffMonthly, sumDiff } = calcRateDiffs(actualRateMonthly, targetRateMonthly, sumActualRate, sumTargetRate);
    return {
        totalDebt: { sum: latestDebt?.totalDebt ?? null, months: totalDebtMonthly },
        overdueDebt: { sum: latestDebt?.overdueDebt ?? null, months: overdueDebtMonthly },
        targetRate: { sum: sumTargetRate, months: targetRateMonthly },
        actualRate: { sum: sumActualRate, months: actualRateMonthly },
        diffRate: { sum: sumDiff, months: diffMonthly },
    };
};
// bảng kế hoạch
const buildPlanningTable = (planningRows, targetMap, { getVnYearAndMonth, getDeadline20hMs }, year, nowMs) => {
    const orderPlanMap = new Map();
    for (let i = 0; i < planningRows.length; i++) {
        const row = planningRows[i];
        if (!row.orderId)
            continue;
        let orderItem = orderPlanMap.get(row.orderId);
        if (!orderItem) {
            orderItem = {
                orderId: row.orderId,
                dateRequestShipping: row.Order?.dateRequestShipping,
                completedTsList: [],
                monthCandidateTsList: [],
                hasCompleteWithoutDate: false,
                hasIncompletePaper: false,
            };
            orderPlanMap.set(row.orderId, orderItem);
        }
        if (row.dayCompleted) {
            const compTs = (0, actionPlanHelper_1.toTimestamp)(row.dayCompleted);
            if (!Number.isNaN(compTs)) {
                orderItem.completedTsList.push(compTs);
                orderItem.monthCandidateTsList.push(compTs);
            }
        }
        else if (row.status === "complete") {
            // Đơn chạy tồn sẵn đã complete nhưng không có dayCompleted -> Đã xong & không tính trễ
            orderItem.hasCompleteWithoutDate = true;
            if (row.dayStart) {
                const startTs = (0, actionPlanHelper_1.toTimestamp)(row.dayStart);
                if (!Number.isNaN(startTs)) {
                    orderItem.monthCandidateTsList.push(startTs);
                }
            }
        }
        else {
            orderItem.hasIncompletePaper = true;
        }
    }
    const statsByMonth = Array.from({ length: 12 }, () => ({ total: 0, late: 0 }));
    for (const orderItem of orderPlanMap.values()) {
        const deadline20hMs = orderItem.dateRequestShipping
            ? getDeadline20hMs(orderItem.dateRequestShipping)
            : null;
        const isAllCompleted = !orderItem.hasIncompletePaper &&
            (orderItem.completedTsList.length > 0 || orderItem.hasCompleteWithoutDate);
        if (isAllCompleted) {
            const refMs = orderItem.completedTsList.length > 0
                ? Math.max(...orderItem.completedTsList)
                : Math.max(...orderItem.monthCandidateTsList);
            const { year: compYear, monthIdx: compMonthIdx } = getVnYearAndMonth(refMs);
            if (compYear === year && compMonthIdx >= 0 && compMonthIdx <= 11) {
                statsByMonth[compMonthIdx].total += 1;
                if (!orderItem.hasCompleteWithoutDate && deadline20hMs !== null) {
                    const finalCompletedMs = Math.max(...orderItem.completedTsList);
                    if (finalCompletedMs > deadline20hMs) {
                        statsByMonth[compMonthIdx].late += 1;
                    }
                }
            }
        }
        else if (deadline20hMs !== null && nowMs > deadline20hMs) {
            const { year: dueYear, monthIdx: dueMonthIdx } = getVnYearAndMonth(deadline20hMs);
            if (dueYear === year && dueMonthIdx >= 0 && dueMonthIdx <= 11) {
                statsByMonth[dueMonthIdx].total += 1;
                statsByMonth[dueMonthIdx].late += 1;
            }
        }
    }
    const totalOrdersMonthly = MONTHS.map((m) => statsByMonth[m - 1].total);
    const lateOrdersMonthly = MONTHS.map((m) => statsByMonth[m - 1].late);
    const lateRateMonthly = MONTHS.map((_, idx) => {
        const tot = totalOrdersMonthly[idx];
        return tot > 0 ? (0, core_debt_helper_1.round2)((lateOrdersMonthly[idx] / tot) * 100) : null;
    });
    const targetRateMonthly = MONTHS.map((m) => Number(targetMap.get(m)?.targetOrderOnTimeRate) || 0);
    const actualRateMonthly = lateRateMonthly.map((lateRate) => lateRate !== null ? Math.max(0, (0, core_debt_helper_1.round2)(100 - lateRate)) : null);
    const sumOrders = totalOrdersMonthly.reduce((a, b) => a + b, 0);
    const sumLateOrders = lateOrdersMonthly.reduce((a, b) => a + b, 0);
    const sumLateRate = sumOrders > 0 ? (0, core_debt_helper_1.round2)((sumLateOrders / sumOrders) * 100) : null;
    const sumActualRate = sumLateRate !== null ? Math.max(0, (0, core_debt_helper_1.round2)(100 - sumLateRate)) : null;
    const sumTargetRate = (0, actionPlanHelper_1.calcAvgTarget)(targetRateMonthly);
    const { diffMonthly, sumDiff } = calcRateDiffs(actualRateMonthly, targetRateMonthly, sumActualRate, sumTargetRate);
    return {
        totalOrders: { sum: sumOrders, months: totalOrdersMonthly },
        lateOrders: { sum: sumLateOrders, months: lateOrdersMonthly },
        lateRate: { sum: sumLateRate, months: lateRateMonthly },
        targetRate: { sum: sumTargetRate, months: targetRateMonthly },
        actualRate: { sum: sumActualRate, months: actualRateMonthly },
        diffRate: { sum: sumDiff, months: diffMonthly },
    };
};
// bảng sản xuất
const buildProductionTable = (planningRows, prodReports, targetMap, { getVnMonthIndex, calcPlanDelayHours }, startOfYearMs, endOfYearMs) => {
    const prodHoursByMonth = new Array(12).fill(0);
    const lateProdHoursByMonth = new Array(12).fill(0);
    const totalPlansByMonth = new Array(12).fill(0);
    const onTimePlansByMonth = new Array(12).fill(0);
    // 1. Tổng giờ chạy thực tế
    for (let i = 0; i < prodReports.length; i++) {
        const rep = prodReports[i];
        if (!rep.dayReport)
            continue;
        const mIdx = getVnMonthIndex(rep.dayReport);
        if (mIdx >= 0 && mIdx <= 11) {
            prodHoursByMonth[mIdx] += (Number(rep.totalDurations) || 0) / 60;
        }
    }
    // 2. Thống kê lệnh sản xuất và giờ trễ máy từ planningRows
    for (let i = 0; i < planningRows.length; i++) {
        const row = planningRows[i];
        if (!row.dayStart)
            continue;
        const startTs = (0, actionPlanHelper_1.toTimestamp)(row.dayStart);
        if (Number.isNaN(startTs) || startTs < startOfYearMs || startTs > endOfYearMs)
            continue;
        const mIdx = getVnMonthIndex(startTs);
        if (mIdx >= 0 && mIdx <= 11) {
            totalPlansByMonth[mIdx] += 1;
            if (row.dayCompleted && row.timeRunning) {
                const delayHours = calcPlanDelayHours(startTs, row.timeStart, row.timeRunning, row.dayCompleted);
                if (delayHours > 0) {
                    lateProdHoursByMonth[mIdx] += delayHours;
                }
                else {
                    onTimePlansByMonth[mIdx] += 1;
                }
            }
        }
    }
    // 3. Chuẩn hóa theo từng tháng (Chỉ tính các tháng ĐÃ CÓ giờ sản xuất thực tế > 0)
    const totalHoursMonthly = MONTHS.map((m) => {
        const val = prodHoursByMonth[m - 1];
        return val > 0 ? Math.round(val * 10) / 10 : 0;
    });
    // Giờ trễ máy: Nếu tháng chưa có giờ sản xuất thực tế (như T1 - T5), trả về null để UI hiển thị '-'
    const lateHoursMonthly = MONTHS.map((m) => {
        const idx = m - 1;
        if (prodHoursByMonth[idx] <= 0)
            return null;
        return Math.round(lateProdHoursByMonth[idx] * 10) / 10;
    });
    const targetRateMonthly = MONTHS.map((m) => Number(targetMap.get(m)?.targetProductionCompletionRate) || 0);
    // Cách 1: Tỷ lệ lệnh sản xuất hoàn thành đúng tiến độ (%)
    // Nếu tháng chưa có giờ sản xuất (T1 - T5), trả về null để UI hiển thị '-'
    const actualRateMonthly = MONTHS.map((m) => {
        const idx = m - 1;
        if (prodHoursByMonth[idx] <= 0)
            return null;
        const totalPlans = totalPlansByMonth[idx];
        const onTimePlans = onTimePlansByMonth[idx];
        return totalPlans > 0 ? (0, core_debt_helper_1.round2)((onTimePlans / totalPlans) * 100) : null;
    });
    // 4. Tính tổng cả năm (Chỉ cộng trên các tháng có phát sinh giờ sản xuất)
    const sumTotal = Math.round(totalHoursMonthly.reduce((a, b) => a + (b || 0), 0) * 10) / 10;
    const validLateHours = lateHoursMonthly.filter((h) => h !== null);
    const sumLate = validLateHours.length > 0
        ? Math.round(validLateHours.reduce((a, b) => a + b, 0) * 10) / 10
        : null;
    let activeTotalPlans = 0;
    let activeOnTimePlans = 0;
    for (let i = 0; i < 12; i++) {
        if (prodHoursByMonth[i] > 0) {
            activeTotalPlans += totalPlansByMonth[i];
            activeOnTimePlans += onTimePlansByMonth[i];
        }
    }
    const sumActualRate = activeTotalPlans > 0 ? (0, core_debt_helper_1.round2)((activeOnTimePlans / activeTotalPlans) * 100) : null;
    const sumTargetRate = (0, actionPlanHelper_1.calcAvgTarget)(targetRateMonthly);
    const { diffMonthly, sumDiff } = calcRateDiffs(actualRateMonthly, targetRateMonthly, sumActualRate, sumTargetRate);
    return {
        totalProdHours: { sum: sumTotal, months: totalHoursMonthly },
        lateProdHours: { sum: sumLate, months: lateHoursMonthly },
        targetRate: { sum: sumTargetRate, months: targetRateMonthly },
        actualRate: { sum: sumActualRate, months: actualRateMonthly },
        diffRate: { sum: sumDiff, months: diffMonthly },
    };
};
const calcRateDiffs = (actualMonthly, targetMonthly, sumActual, sumTarget) => {
    const diffMonthly = MONTHS.map((_, idx) => {
        const act = actualMonthly[idx];
        return act !== null ? (0, core_debt_helper_1.round2)(act - targetMonthly[idx]) : null;
    });
    const sumDiff = sumActual !== null ? (0, core_debt_helper_1.round2)(sumActual - sumTarget) : null;
    return { diffMonthly, sumDiff };
};
//# sourceMappingURL=actionPlanService.js.map