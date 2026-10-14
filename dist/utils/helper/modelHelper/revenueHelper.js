"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPaperShiftDate = exports.reportEffectiveUserId = exports.createEmptyYear = exports.toVNDate = exports.aggregateDailyAmounts = exports.roundInt = void 0;
const dayjs_config_1 = require("../../../assets/configs/dayjs/dayjs.config");
const roundInt = (val) => Math.round(Number(val) || 0);
exports.roundInt = roundInt;
const aggregateDailyAmounts = ({ records, getDateFn, getAmountFn, timezone, }) => {
    const map = new Map();
    for (const item of records) {
        const rawDate = getDateFn(item);
        if (!rawDate)
            continue;
        // 1. Lấy epoch time (tránh khởi tạo Date mới nếu Sequelize đã trả về sẵn Date object)
        const timestamp = rawDate instanceof Date ? rawDate.getTime() : new Date(rawDate).getTime();
        if (Number.isNaN(timestamp))
            continue;
        // 2. Dịch sang UTC+7 và cắt chuỗi 'YYYY-MM-DD'
        const dateKey = new Date(timestamp + timezone).toISOString().slice(0, 10);
        // 3. Gom dồn số tiền (làm tròn số tiền của từng bản ghi)
        const amount = (0, exports.roundInt)(getAmountFn(item));
        map.set(dateKey, (map.get(dateKey) || 0) + amount);
    }
    return map;
};
exports.aggregateDailyAmounts = aggregateDailyAmounts;
const toVNDate = (rawDate, timezone) => {
    if (!rawDate)
        return null;
    const timestamp = rawDate instanceof Date ? rawDate.getTime() : new Date(rawDate).getTime();
    if (Number.isNaN(timestamp))
        return null;
    return new Date(timestamp + timezone);
};
exports.toVNDate = toVNDate;
// Helper tạo khung 12 tháng trắng
const createEmptyYear = () => {
    const months = {};
    for (let m = 1; m <= 12; m++)
        months[m] = 0;
    return { months, yearTotal: 0 };
};
exports.createEmptyYear = createEmptyYear;
// helper phân quyền
const reportEffectiveUserId = (currentUser, targetUserId, all) => {
    const role = currentUser.role?.toLowerCase();
    const isManager = ["admin", "manager"].includes(role);
    const isSales = currentUser.permissions?.includes("sale") ?? false;
    if (isManager) {
        return !all && targetUserId ? Number(targetUserId) : null;
    }
    else if (isSales) {
        return currentUser.userId;
    }
    // chỉ xem tổng quát
    return null;
};
exports.reportEffectiveUserId = reportEffectiveUserId;
// Helper lấy ngày ca giấy
const getPaperShiftDate = (date) => (0, dayjs_config_1.dayjsUtc)(date).subtract(6, "hour").format("YYYY-MM-DD");
exports.getPaperShiftDate = getPaperShiftDate;
//# sourceMappingURL=revenueHelper.js.map