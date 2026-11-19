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
const PAST_YEAR_TTL = 7 * 24 * 60 * 60; // 7 ngày
const CURRENT_YEAR_TTL = 15 * 60; // 15 phút
// Chống Cache Stampede khi nhiều user cùng gọi lúc cache vừa hết hạn
const inFlightRequests = new Map();
exports.actionPlanService = {
    getYearlyActionPlan: async ({ year }) => {
        const cacheKey = actionPlan.yearly(year);
        const cachedData = await redis_connect_1.default.get(cacheKey);
        if (cachedData) {
            if (devEnvironment)
                console.log("✅ Data action plan from Redis cache");
            return JSON.parse(cachedData);
        }
        const existingPromise = inFlightRequests.get(year);
        if (existingPromise) {
            return existingPromise;
        }
        const fetchPromise = (async () => {
            const dateHelpers = (0, actionPlanHelper_1.createVnDateHelpers)(year);
            const startOfYear = dayjs_config_1.dayjsUtc.tz(`${year}-01-01 00:00:00`, dayjs_config_1.VN_TZ).toDate();
            const endOfYear = dayjs_config_1.dayjsUtc.tz(`${year}-12-31 23:59:59.999`, dayjs_config_1.VN_TZ).toDate();
            const startOfYearDateOnly = `${year}-01-01`;
            const endOfYearDateOnly = `${year}-12-31`;
            const nowMs = Date.now();
            const [targets, outboundRevenueByMonth, planningRows, unscheduledOrderIds, prodDurationsByMonth, debtSnapshots,] = await Promise.all([
                actionPlanRepository_1.actionPlanRepository.getTargetsByYear(year),
                actionPlanRepository_1.actionPlanRepository.getOutboundRevenueByMonth(startOfYear, endOfYear),
                actionPlanRepository_1.actionPlanRepository.getPlanningPapersForYear(startOfYear, endOfYear),
                actionPlanRepository_1.actionPlanRepository.getUnscheduledIncompleteOrderIds(),
                actionPlanRepository_1.actionPlanRepository.getDailyReportDurationsByMonth(startOfYearDateOnly, endOfYearDateOnly),
                actionPlanRepository_1.actionPlanRepository.getDebtSnapshotsByYear(year),
            ]);
            const targetMap = new Map(targets.map((t) => [Number(t.month), t]));
            const result = {
                year,
                salesTable: buildSalesTable(outboundRevenueByMonth, targetMap),
                debtTable: buildDebtTable(debtSnapshots, targetMap),
                planningTable: buildPlanningTable(planningRows, unscheduledOrderIds, targetMap, dateHelpers, year, nowMs),
                prodTable: buildProductionTable(planningRows, prodDurationsByMonth, targetMap, dateHelpers, startOfYear.getTime(), endOfYear.getTime(), nowMs),
            };
            const currentVnYear = dayjs_config_1.dayjsUtc.tz(new Date(), dayjs_config_1.VN_TZ).year();
            const ttl = year < currentVnYear ? PAST_YEAR_TTL : CURRENT_YEAR_TTL;
            await redis_connect_1.default.set(cacheKey, JSON.stringify(result), "EX", ttl);
            return result;
        })();
        inFlightRequests.set(year, fetchPromise);
        try {
            return await fetchPromise;
        }
        finally {
            inFlightRequests.delete(year);
        }
    },
    saveYearlyTargets: async ({ year, targetsList, updatedBy, }) => {
        if (!Array.isArray(targetsList) || targetsList.length === 0) {
            throw new Error("Danh sách mục tiêu không được rỗng");
        }
        const rows = targetsList
            .filter((item) => {
            const m = Number(item.month);
            return Number.isInteger(m) && m >= 1 && m <= 12;
        })
            .map((item) => ({
            year,
            month: Number(item.month),
            targetRevenue: Number(item.targetRevenue) || 0,
            targetDebtOnTimeRate: Number(item.targetDebtOnTimeRate) || 0,
            targetOrderOnTimeRate: Number(item.targetOrderOnTimeRate) || 0,
            targetProductionCompletionRate: Number(item.targetProductionCompletionRate) || 0,
            note: item.note ?? null,
            updatedBy: updatedBy ?? null,
        }));
        if (rows.length === 0) {
            throw new Error("Không có tháng hợp lệ (1-12) để lưu mục tiêu");
        }
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
        await redis_connect_1.default.del(actionPlan.yearly(year));
        return { message: "Lưu mục tiêu kế hoạch thành công" };
    },
    captureDebtSnapshot: async ({ snapshotDate = new Date(), year, month, closingDay, isCron = false, } = {}) => {
        const vnTime = dayjs_config_1.dayjsUtc.tz(snapshotDate, dayjs_config_1.VN_TZ);
        const actualDay = vnTime.date();
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
        await redis_connect_1.default.del(actionPlan.yearly(targetYear));
        return {
            message: `Đã lưu snapshot công nợ kỳ ngày ${targetClosingDay}/${targetMonth}/${targetYear}`,
            data: {
                year: targetYear,
                month: targetMonth,
                closingDay: targetClosingDay,
                snapshotDate: vnTime.toDate(),
                totalDebt: summary.totalDebt,
                overdueDebt: summary.overdueDebt,
                onTimeDebt: summary.onTimeDebt,
                onTimeRate: summary.onTimeRate,
                customerCount: summary.customerCount,
            },
        };
    },
};
// ==================== BẢNG 1: BÁN HÀNG ====================
const buildSalesTable = (outboundRevenueByMonth, targetMap) => {
    const actualRevenueByMonth = new Array(12).fill(0);
    for (let i = 0; i < outboundRevenueByMonth.length; i++) {
        const row = outboundRevenueByMonth[i];
        const mIdx = Number(row.month) - 1;
        if (mIdx >= 0 && mIdx <= 11) {
            actualRevenueByMonth[mIdx] = Number(row.totalRevenue) || 0;
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
// ==================== BẢNG 2: THU NỢ ====================
const buildDebtTable = (debtSnapshots, targetMap) => {
    // Query đã order theo month ASC, closingDay ASC -> luôn lấy kỳ chốt mới nhất trong tháng
    const debtMap = new Map();
    for (let i = 0; i < debtSnapshots.length; i++) {
        const s = debtSnapshots[i];
        const month = Number(s.month);
        const closingDay = Number(s.closingDay) || 0;
        const existing = debtMap.get(month);
        if (!existing || closingDay >= existing.closingDay) {
            debtMap.set(month, {
                closingDay,
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
// ==================== BẢNG 3: KẾ HOẠCH ====================
const buildPlanningTable = (planningRows, unscheduledOrderIds, targetMap, { getVnYearAndMonth, getDeadline20hMs }, year, nowMs) => {
    const orderPlanMap = new Map();
    for (let i = 0; i < planningRows.length; i++) {
        const row = planningRows[i];
        if (!row.orderId)
            continue;
        let orderItem = orderPlanMap.get(row.orderId);
        if (!orderItem) {
            orderItem = {
                orderId: row.orderId,
                // Đọc trực tiếp key phẳng vì đã bỏ nest: true
                dateRequestShipping: row["Order.dateRequestShipping"] ?? row.Order?.dateRequestShipping ?? null,
                completedTsList: [],
                monthCandidateTsList: [],
                hasCompleteWithoutDate: false,
                // Nếu đơn còn phiếu chưa xếp lịch ở ngoài phạm vi query -> đánh dấu chưa hoàn thành
                hasIncompletePaper: unscheduledOrderIds.has(row.orderId),
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
            // Chặn Math.max trên mảng rỗng (tránh -Infinity -> NaN)
            let refMs = null;
            if (orderItem.completedTsList.length > 0) {
                refMs = Math.max(...orderItem.completedTsList);
            }
            else if (orderItem.monthCandidateTsList.length > 0) {
                refMs = Math.max(...orderItem.monthCandidateTsList);
            }
            else if (deadline20hMs !== null) {
                refMs = deadline20hMs;
            }
            if (refMs === null)
                continue;
            const { year: compYear, monthIdx: compMonthIdx } = getVnYearAndMonth(refMs);
            if (compYear === year && compMonthIdx >= 0 && compMonthIdx <= 11) {
                statsByMonth[compMonthIdx].total += 1;
                // SỬA LỖI LOGIC: Chỉ cần có ít nhất 1 phiếu ghi nhận dayCompleted vượt deadline là tính trễ
                if (orderItem.completedTsList.length > 0 && deadline20hMs !== null) {
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
// ==================== BẢNG 4: SẢN XUẤT ====================
const buildProductionTable = (planningRows, prodDurationsByMonth, targetMap, { getVnMonthIndex, calcPlanDelayHours }, startOfYearMs, endOfYearMs, nowMs) => {
    const prodHoursByMonth = new Array(12).fill(0);
    const lateProdHoursByMonth = new Array(12).fill(0);
    const totalPlansByMonth = new Array(12).fill(0);
    const onTimePlansByMonth = new Array(12).fill(0);
    // 1. Tổng giờ chạy thực tế từ SQL aggregate (tối đa 12 dòng)
    for (let i = 0; i < prodDurationsByMonth.length; i++) {
        const rep = prodDurationsByMonth[i];
        const mIdx = Number(rep.month) - 1;
        if (mIdx >= 0 && mIdx <= 11) {
            prodHoursByMonth[mIdx] = (Number(rep.totalDurations) || 0) / 60;
        }
    }
    // 2. Thống kê lệnh sản xuất đúng tiến độ & trễ tiến độ
    const nowDate = new Date(nowMs);
    for (let i = 0; i < planningRows.length; i++) {
        const row = planningRows[i];
        if (!row.dayStart)
            continue;
        const startTs = (0, actionPlanHelper_1.toTimestamp)(row.dayStart);
        if (Number.isNaN(startTs) || startTs < startOfYearMs || startTs > endOfYearMs)
            continue;
        const mIdx = getVnMonthIndex(startTs);
        if (mIdx < 0 || mIdx > 11)
            continue;
        if (row.dayCompleted) {
            totalPlansByMonth[mIdx] += 1;
            if (row.timeRunning) {
                const delayHours = calcPlanDelayHours(startTs, row.timeStart, row.timeRunning, row.dayCompleted);
                if (delayHours > 0) {
                    lateProdHoursByMonth[mIdx] += delayHours;
                }
                else {
                    onTimePlansByMonth[mIdx] += 1;
                }
            }
            else {
                onTimePlansByMonth[mIdx] += 1;
            }
        }
        else if (row.status === "complete") {
            totalPlansByMonth[mIdx] += 1;
            onTimePlansByMonth[mIdx] += 1;
        }
        else if (row.timeRunning) {
            const overdueHours = calcPlanDelayHours(startTs, row.timeStart, row.timeRunning, nowDate);
            if (overdueHours > 0) {
                totalPlansByMonth[mIdx] += 1;
            }
        }
    }
    // 3. Chuẩn hóa dữ liệu từng tháng
    // SỬA LỖI LOGIC: Tách chỉ số lệnh SX dựa vào totalPlansByMonth > 0 thay vì bị chặn bởi prodHoursByMonth > 0
    const totalHoursMonthly = MONTHS.map((m) => {
        const val = prodHoursByMonth[m - 1];
        return val > 0 ? Math.round(val * 10) / 10 : 0;
    });
    const lateHoursMonthly = MONTHS.map((m) => {
        const idx = m - 1;
        if (prodHoursByMonth[idx] <= 0 && totalPlansByMonth[idx] <= 0)
            return null;
        return Math.round(lateProdHoursByMonth[idx] * 10) / 10;
    });
    const totalPlansMonthly = MONTHS.map((m) => totalPlansByMonth[m - 1]);
    const latePlansMonthly = MONTHS.map((m) => {
        const idx = m - 1;
        if (totalPlansByMonth[idx] <= 0)
            return null;
        return totalPlansByMonth[idx] - onTimePlansByMonth[idx];
    });
    const targetRateMonthly = MONTHS.map((m) => Number(targetMap.get(m)?.targetProductionCompletionRate) || 0);
    const actualRateMonthly = MONTHS.map((m) => {
        const idx = m - 1;
        const totalPlans = totalPlansByMonth[idx];
        if (totalPlans <= 0)
            return null;
        return (0, core_debt_helper_1.round2)((onTimePlansByMonth[idx] / totalPlans) * 100);
    });
    // 4. Tổng hợp cả năm
    const sumTotal = Math.round(totalHoursMonthly.reduce((a, b) => a + b, 0) * 10) / 10;
    const validLateHours = lateHoursMonthly.filter((h) => h !== null);
    const sumLate = validLateHours.length > 0
        ? Math.round(validLateHours.reduce((a, b) => a + b, 0) * 10) / 10
        : null;
    const sumTotalPlans = totalPlansByMonth.reduce((a, b) => a + b, 0);
    const sumOnTimePlans = onTimePlansByMonth.reduce((a, b) => a + b, 0);
    const sumLatePlans = sumTotalPlans > 0 ? sumTotalPlans - sumOnTimePlans : null;
    const sumActualRate = sumTotalPlans > 0 ? (0, core_debt_helper_1.round2)((sumOnTimePlans / sumTotalPlans) * 100) : null;
    const sumTargetRate = (0, actionPlanHelper_1.calcAvgTarget)(targetRateMonthly);
    const { diffMonthly, sumDiff } = calcRateDiffs(actualRateMonthly, targetRateMonthly, sumActualRate, sumTargetRate);
    return {
        totalProdHours: { sum: sumTotal, months: totalHoursMonthly },
        lateProdHours: { sum: sumLate, months: lateHoursMonthly },
        totalPlans: { sum: sumTotalPlans, months: totalPlansMonthly },
        latePlans: { sum: sumLatePlans, months: latePlansMonthly },
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