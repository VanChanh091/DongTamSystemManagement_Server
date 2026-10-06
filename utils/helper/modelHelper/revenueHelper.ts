import { dayjsUtc } from "../../../assets/configs/dayjs/dayjs.config";
import { YearSalesData } from "../../../interface/synthetic/revenue.type";

export const roundInt = (val: number | string | undefined | null): number =>
  Math.round(Number(val) || 0);

export const aggregateDailyAmounts = <T>({
  records,
  getDateFn,
  getAmountFn,
  timezone,
}: {
  records: T[];
  getDateFn: (item: T) => Date | string | undefined | null;
  getAmountFn: (item: T) => number | string | undefined | null;
  timezone: number;
}): Map<string, number> => {
  const map = new Map<string, number>();

  for (const item of records) {
    const rawDate = getDateFn(item);
    if (!rawDate) continue;

    // 1. Lấy epoch time (tránh khởi tạo Date mới nếu Sequelize đã trả về sẵn Date object)
    const timestamp = rawDate instanceof Date ? rawDate.getTime() : new Date(rawDate).getTime();
    if (Number.isNaN(timestamp)) continue;

    // 2. Dịch sang UTC+7 và cắt chuỗi 'YYYY-MM-DD'
    const dateKey = new Date(timestamp + timezone).toISOString().slice(0, 10);

    // 3. Gom dồn số tiền (làm tròn số tiền của từng bản ghi)
    const amount = roundInt(getAmountFn(item));
    map.set(dateKey, (map.get(dateKey) || 0) + amount);
  }

  return map;
};

export const toVNDate = (
  rawDate: Date | string | undefined | null,
  timezone: number,
): Date | null => {
  if (!rawDate) return null;
  const timestamp = rawDate instanceof Date ? rawDate.getTime() : new Date(rawDate).getTime();
  if (Number.isNaN(timestamp)) return null;
  return new Date(timestamp + timezone);
};

// Helper tạo khung 12 tháng trắng
export const createEmptyYear = (): YearSalesData => {
  const months: Record<number, number> = {};
  for (let m = 1; m <= 12; m++) months[m] = 0;
  return { months, yearTotal: 0 };
};

// helper phân quyền
export const reportEffectiveUserId = (
  currentUser: {
    userId: number;
    role: string;
    permissions?: string[];
  },
  targetUserId?: number | null,
  all?: boolean,
): number | null => {
  const role = currentUser.role?.toLowerCase();

  const isManager = ["admin", "manager"].includes(role);
  const isSales = currentUser.permissions?.includes("sale") ?? false;

  if (isManager) {
    return !all && targetUserId ? Number(targetUserId) : null;
  } else if (isSales) {
    return currentUser.userId;
  }

  // chỉ xem tổng quát
  return null;
};

// Helper lấy ngày ca giấy
export const getPaperShiftDate = (date: string | Date): string =>
  dayjsUtc(date).subtract(6, "hour").format("YYYY-MM-DD");
