import { dayjsUtc, VN_TZ } from "../../../assets/configs/dayjs/dayjs.config";
import { debtRepository } from "../../../repository/debt/debtRepository";
import { mapToDebtItemDTO, processDebtAggregation, round2 } from "../core_debt_helper";

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const MIN_MS = 60 * 1000;

export const toTimestamp = (d: Date | string): number => {
  return d instanceof Date ? d.getTime() : Date.parse(d);
};

export const calcAvgTarget = (rates: number[]): number => {
  const active = rates.filter((r) => r > 0);
  return active.length > 0 ? round2(active.reduce((a, b) => a + b, 0) / active.length) : 0;
};

export const parseTimeStrToMinutes = (timeStr?: string | null): number | null => {
  if (!timeStr || !timeStr.includes(":")) return null;
  const [hStr, mStr] = timeStr.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};

export const createVnDateHelpers = (year: number) => {
  // Lấy offset động từ chính dayjsUtc + VN_TZ (chỉ gọi 1 lần duy nhất mỗi request)
  const vnOffsetMs = dayjsUtc.tz(`${year}-01-01`, VN_TZ).utcOffset() * MIN_MS;

  const getVnMonthIndex = (d: Date | string | number): number => {
    if (typeof d === "string" && d.length === 10) {
      return Number(d.slice(5, 7)) - 1;
    }
    const ts = typeof d === "number" ? d : toTimestamp(d);
    if (Number.isNaN(ts)) return -1;
    return new Date(ts + vnOffsetMs).getUTCMonth();
  };

  const getVnYearAndMonth = (ts: number): { year: number; monthIdx: number } => {
    const dt = new Date(ts + vnOffsetMs);
    return {
      year: dt.getUTCFullYear(),
      monthIdx: dt.getUTCMonth(),
    };
  };

  // Mốc 20:00:00 giờ VN của ngày dateRequestShipping
  const getDeadline20hMs = (dateRequestShipping: Date | string): number | null => {
    if (typeof dateRequestShipping === "string" && dateRequestShipping.length === 10) {
      const y = Number(dateRequestShipping.slice(0, 4));
      const m = Number(dateRequestShipping.slice(5, 7)) - 1;
      const day = Number(dateRequestShipping.slice(8, 10));
      return Date.UTC(y, m, day) - vnOffsetMs + 20 * HOUR_MS;
    }
    const ts = toTimestamp(dateRequestShipping);
    if (Number.isNaN(ts)) return null;
    const dt = new Date(ts + vnOffsetMs);
    const midnightMs =
      Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()) - vnOffsetMs;
    return midnightMs + 20 * HOUR_MS;
  };

  // Tính số giờ trễ SX theo khung ca 06:00 hôm nay -> 06:00 hôm sau
  const calcPlanDelayHours = (
    startTs: number,
    timeStart: string | null | undefined,
    timeRunning: string,
    dayCompleted: Date | string,
  ): number => {
    const endMins = parseTimeStrToMinutes(timeRunning);
    if (endMins === null) return 0;

    const actualTs = toTimestamp(dayCompleted);
    if (Number.isNaN(actualTs)) return 0;

    const vnStartDt = new Date(startTs + vnOffsetMs);
    const midnightMs =
      Date.UTC(vnStartDt.getUTCFullYear(), vnStartDt.getUTCMonth(), vnStartDt.getUTCDate()) -
      vnOffsetMs;

    const startMins = parseTimeStrToMinutes(timeStart);

    // Ca SX chạy từ 06:00 hôm nay -> 06:00 hôm sau:
    // Nếu timeStart qua 12h đêm (00:00 -> 05:59) thì bản thân timeStart đã nằm ở ngày hôm sau (+1 ngày)
    const isStartAfterMidnight = startMins !== null && startMins < 6 * 60;
    let endDayOffset = isStartAfterMidnight ? 1 : 0;

    // Nếu timeStart ở trước 24:00 nhưng timeRunning < timeStart (vd 22:00 -> 03:00) -> xuyên đêm (+1 ngày)
    if (startMins === null && endMins < 6 * 60) {
      endDayOffset = 1;
    } else if (!isStartAfterMidnight && startMins !== null && endMins < startMins) {
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

export const getGrandDebtSummary = async ({
  targetDate = new Date(),
}: { targetDate?: Date | string } = {}) => {
  const unpaidOutbounds = await debtRepository.findOutboundUnpaid({
    targetDate,
  });

  const { sortedCustomers, grandTotal } = processDebtAggregation(unpaidOutbounds, targetDate);
  const mappedGrandTotal = mapToDebtItemDTO(grandTotal);

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
