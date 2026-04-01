"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildStagesDetails = exports.mergeShiftField = exports.setTimeOnDay = exports.parseTimeOnly = exports.getWorkShift = exports.formatDate = exports.addDays = exports.addMinutes = exports.formatTimeToHHMMSS = void 0;
//HELPER FOR TIME RUNNING
const formatTimeToHHMMSS = (date) => {
    return date.toTimeString().split(" ")[0];
};
exports.formatTimeToHHMMSS = formatTimeToHHMMSS;
const addMinutes = (date, mins) => {
    const d = new Date(date);
    let totalMinutes = mins;
    while (true) {
        const end = new Date(d);
        end.setMinutes(end.getMinutes() + totalMinutes);
        const breakMinutes = isDuringBreak(d, end);
        const newTotal = mins + breakMinutes;
        // console.log(
        //   "totalMinutes:",
        //   totalMinutes,
        //   "breakMinutes:",
        //   breakMinutes,
        //   "newTotal:",
        //   newTotal
        // );
        if (newTotal === totalMinutes) {
            return end;
        }
        totalMinutes = newTotal;
    }
};
exports.addMinutes = addMinutes;
const addDays = (date, days) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
};
exports.addDays = addDays;
const formatDate = (date) => {
    return date.toISOString().split("T")[0];
};
exports.formatDate = formatDate;
const getWorkShift = (day, startTime, hours) => {
    const start = (0, exports.parseTimeOnly)(startTime);
    start.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());
    const end = new Date(start);
    end.setHours(start.getHours() + hours);
    return { startOfWorkTime: start, endOfWorkTime: end };
};
exports.getWorkShift = getWorkShift;
const parseTimeOnly = (timeStr) => {
    const [h, m] = timeStr.split(":").map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
};
exports.parseTimeOnly = parseTimeOnly;
const isDuringBreak = (start, end) => {
    const breaks = [
        { start: "11:30", end: "12:00", duration: 30 },
        { start: "17:00", end: "17:30", duration: 30 },
        { start: "02:00", end: "02:45", duration: 45 },
    ];
    let totalBreak = 0;
    for (const brk of breaks) {
        const bStart = (0, exports.parseTimeOnly)(brk.start);
        const bEnd = (0, exports.parseTimeOnly)(brk.end);
        // Gán cùng ngày với 'start'
        bStart.setFullYear(start.getFullYear(), start.getMonth(), start.getDate());
        bEnd.setFullYear(start.getFullYear(), start.getMonth(), start.getDate());
        if (bEnd <= bStart)
            bEnd.setDate(bEnd.getDate() + 1);
        if (end > bStart && start < bEnd) {
            totalBreak += brk.duration;
        }
    }
    return totalBreak;
};
const setTimeOnDay = (date, timeStrOrDate) => {
    const t = typeof timeStrOrDate === "string" ? (0, exports.parseTimeOnly)(timeStrOrDate) : new Date(timeStrOrDate);
    t.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
    return t;
};
exports.setTimeOnDay = setTimeOnDay;
const mergeShiftField = (currentValue, incoming) => {
    if (!incoming)
        return currentValue;
    const newValue = incoming.trim();
    const exists = currentValue
        .split(",")
        .map((s) => s.trim())
        .includes(newValue);
    if (!exists) {
        return currentValue ? `${currentValue}, ${newValue}` : newValue;
    }
    return currentValue;
};
exports.mergeShiftField = mergeShiftField;
const buildStagesDetails = async ({ detail, getBoxTimes, getPlanningBoxId, getAllOverflow, }) => {
    // lấy toàn bộ stages bình thường
    const normalStages = getBoxTimes(detail)?.map((s) => s.toJSON()) ?? [];
    // lấy overflow theo planningBoxId
    const planningBoxId = getPlanningBoxId(detail);
    const allOverflow = await getAllOverflow(planningBoxId);
    // gom overflow theo machine
    const overflowByMachine = {};
    for (const ov of allOverflow) {
        overflowByMachine[ov.machine] = ov;
    }
    // merge stage + overflow tương ứng
    const stages = normalStages.map((stage) => ({
        ...stage,
        timeOverFlow: overflowByMachine[String(stage.machine)] ?? null,
    }));
    return stages;
};
exports.buildStagesDetails = buildStagesDetails;
//# sourceMappingURL=planningHelper.js.map