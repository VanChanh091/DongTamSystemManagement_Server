"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGrandDebtSummary = exports.createVnDateHelpers = exports.parseTimeStrToMinutes = exports.calcAvgTarget = exports.toTimestamp = void 0;
const dayjs_config_1 = require("../../../assets/configs/dayjs/dayjs.config");
const debtRepository_1 = require("../../../repository/debt/debtRepository");
const core_debt_helper_1 = require("../core_debt_helper");
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const MIN_MS = 60 * 1000;
const toTimestamp = (d) => {
    return d instanceof Date ? d.getTime() : Date.parse(d);
};
exports.toTimestamp = toTimestamp;
const calcAvgTarget = (rates) => {
    const active = rates.filter((r) => r > 0);
    return active.length > 0 ? (0, core_debt_helper_1.round2)(active.reduce((a, b) => a + b, 0) / active.length) : 0;
};
exports.calcAvgTarget = calcAvgTarget;
const parseTimeStrToMinutes = (timeStr) => {
    if (!timeStr || !timeStr.includes(":"))
        return null;
    const [hStr, mStr] = timeStr.split(":");
    const h = Number(hStr);
    const m = Number(mStr);
    if (Number.isNaN(h) || Number.isNaN(m))
        return null;
    return h * 60 + m;
};
exports.parseTimeStrToMinutes = parseTimeStrToMinutes;
const createVnDateHelpers = (year) => {
    // Lấy offset động từ chính dayjsUtc + VN_TZ (chỉ gọi 1 lần duy nhất mỗi request)
    const vnOffsetMs = dayjs_config_1.dayjsUtc.tz(`${year}-01-01`, dayjs_config_1.VN_TZ).utcOffset() * MIN_MS;
    const getVnMonthIndex = (d) => {
        if (typeof d === "string" && d.length === 10) {
            return Number(d.slice(5, 7)) - 1;
        }
        const ts = typeof d === "number" ? d : (0, exports.toTimestamp)(d);
        if (Number.isNaN(ts))
            return -1;
        return new Date(ts + vnOffsetMs).getUTCMonth();
    };
    const getVnYearAndMonth = (ts) => {
        const dt = new Date(ts + vnOffsetMs);
        return {
            year: dt.getUTCFullYear(),
            monthIdx: dt.getUTCMonth(),
        };
    };
    // Mốc 20:00:00 giờ VN của ngày dateRequestShipping
    const getDeadline20hMs = (dateRequestShipping) => {
        if (typeof dateRequestShipping === "string" && dateRequestShipping.length === 10) {
            const y = Number(dateRequestShipping.slice(0, 4));
            const m = Number(dateRequestShipping.slice(5, 7)) - 1;
            const day = Number(dateRequestShipping.slice(8, 10));
            return Date.UTC(y, m, day) - vnOffsetMs + 20 * HOUR_MS;
        }
        const ts = (0, exports.toTimestamp)(dateRequestShipping);
        if (Number.isNaN(ts))
            return null;
        const dt = new Date(ts + vnOffsetMs);
        const midnightMs = Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()) - vnOffsetMs;
        return midnightMs + 20 * HOUR_MS;
    };
    // Tính số giờ trễ SX theo khung ca 06:00 hôm nay -> 06:00 hôm sau
    const calcPlanDelayHours = (startTs, timeStart, timeRunning, dayCompleted) => {
        const endMins = (0, exports.parseTimeStrToMinutes)(timeRunning);
        if (endMins === null)
            return 0;
        const actualTs = (0, exports.toTimestamp)(dayCompleted);
        if (Number.isNaN(actualTs))
            return 0;
        const vnStartDt = new Date(startTs + vnOffsetMs);
        const midnightMs = Date.UTC(vnStartDt.getUTCFullYear(), vnStartDt.getUTCMonth(), vnStartDt.getUTCDate()) -
            vnOffsetMs;
        const startMins = (0, exports.parseTimeStrToMinutes)(timeStart);
        // Ca SX chạy từ 06:00 hôm nay -> 06:00 hôm sau:
        // Nếu timeStart qua 12h đêm (00:00 -> 05:59) thì bản thân timeStart đã nằm ở ngày hôm sau (+1 ngày)
        const isStartAfterMidnight = startMins !== null && startMins < 6 * 60;
        let endDayOffset = isStartAfterMidnight ? 1 : 0;
        // Nếu timeStart ở trước 24:00 nhưng timeRunning < timeStart (vd 22:00 -> 03:00) -> xuyên đêm (+1 ngày)
        if (startMins === null && endMins < 6 * 60) {
            endDayOffset = 1;
        }
        else if (!isStartAfterMidnight && startMins !== null && endMins < startMins) {
            endDayOffset = 1;
        }
        const plannedEndMs = midnightMs + endDayOffset * DAY_MS + endMins * MIN_MS;
        return actualTs > plannedEndMs ? (actualTs - plannedEndMs) / HOUR_MS : 0;
    };
    return {
        getVnMonthIndex,
        getVnYearAndMonth,
        getDeadline20hMs,
        calcPlanDelayHours,
    };
};
exports.createVnDateHelpers = createVnDateHelpers;
const getGrandDebtSummary = async ({ targetDate = new Date(), } = {}) => {
    const unpaidOutbounds = await debtRepository_1.debtRepository.findOutboundUnpaid({
        targetDate,
    });
    const { sortedCustomers, grandTotal } = (0, core_debt_helper_1.processDebtAggregation)(unpaidOutbounds, targetDate);
    const mappedGrandTotal = (0, core_debt_helper_1.mapToDebtItemDTO)(grandTotal);
    const totalDebt = Number(mappedGrandTotal?.totalDebt) || 0;
    const overdueDebt = Number(mappedGrandTotal?.overdueDebt) || 0;
    const onTimeDebt = Math.max(0, totalDebt - overdueDebt);
    const onTimeRate = totalDebt > 0 ? Math.round((onTimeDebt / totalDebt) * 1000) / 10 : 100;
    return {
        totalDebt,
        overdueDebt,
        onTimeDebt,
        onTimeRate,
        customerCount: sortedCustomers.length,
    };
};
exports.getGrandDebtSummary = getGrandDebtSummary;
//# sourceMappingURL=actionPlanHelper.js.map