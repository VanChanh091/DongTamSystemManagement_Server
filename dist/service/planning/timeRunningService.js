"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInitialCursor = exports.combineDateAndHHMMSS = exports.formatTime = exports.parseTime = exports.handleOverflow = exports.isDuringBreak = exports.getSpeed = exports.calculateTimeForOnePlanning = exports.calculateTimeRunning = exports.updateSortPlanning = void 0;
const sequelize_1 = require("sequelize");
const planningPaper_1 = require("../../models/planning/planningPaper");
const timeOverflowPlanning_1 = require("../../models/planning/timeOverflowPlanning");
const updateSortPlanning = async (updateIndex, transaction) => {
    const updates = updateIndex
        .filter((item) => item.sortPlanning)
        .map((item) => planningPaper_1.PlanningPaper.update({ sortPlanning: item.sortPlanning }, {
        where: { planningId: item.planningId, status: { [sequelize_1.Op.ne]: "complete" } },
        transaction,
    }));
    await Promise.all(updates);
};
exports.updateSortPlanning = updateSortPlanning;
const calculateTimeRunning = async ({ plannings, machineInfo, machine, dayStart, timeStart, totalTimeWorking, transaction, }) => {
    const updated = [];
    let currentTime, currentDay, lastGhepKho;
    // ✅ Xác định con trỏ bắt đầu
    const feComplete = plannings
        .filter((p) => p.status === "complete")
        .sort((a, b) => new Date(b.dayStart).getTime() - new Date(a.dayStart).getTime())[0];
    if (feComplete) {
        const overflowRecord = feComplete.hasOverFlow
            ? await timeOverflowPlanning_1.timeOverflowPlanning.findOne({
                where: { planningId: feComplete.planningId },
                transaction,
            })
            : null;
        if (overflowRecord?.overflowTimeRunning && overflowRecord?.overflowDayStart) {
            // Sử dụng overflow day + time làm con trỏ
            currentDay = new Date(overflowRecord.overflowDayStart);
            currentTime = (0, exports.combineDateAndHHMMSS)(currentDay, overflowRecord.overflowTimeRunning);
            lastGhepKho = feComplete.ghepKho ?? null;
        }
        else if (feComplete.dayStart && feComplete.timeRunning) {
            // fallback: nếu không tìm thấy record overflow trong DB, dùng dayStart/timeRunning từ FE
            currentDay = new Date(feComplete.dayStart);
            currentTime = (0, exports.combineDateAndHHMMSS)(currentDay, feComplete.timeRunning);
            lastGhepKho = feComplete.ghepKho ?? null;
        }
        else {
            // fallback cuối cùng: dùng logic cũ lấy cursor từ DB
            const initCursor = await (0, exports.getInitialCursor)({ machine, dayStart, timeStart, transaction });
            ({ currentTime, currentDay, lastGhepKho } = initCursor);
        }
    }
    else {
        const initCursor = await (0, exports.getInitialCursor)({ machine, dayStart, timeStart, transaction });
        ({ currentTime, currentDay, lastGhepKho } = initCursor);
    }
    // ✅ Tính từng đơn
    for (let i = 0; i < plannings.length; i++) {
        const planning = plannings[i];
        if (planning.status === "complete")
            continue;
        const data = await (0, exports.calculateTimeForOnePlanning)({
            planning,
            machine,
            machineInfo,
            currentTime,
            currentDay,
            timeStart,
            totalTimeWorking,
            lastGhepKho,
            transaction,
            isFirst: i === 0,
        });
        currentTime = data.nextTime;
        currentDay = data.nextDay;
        lastGhepKho = data.ghepKho;
        updated.push(data.result);
    }
    return updated;
};
exports.calculateTimeRunning = calculateTimeRunning;
const calculateTimeForOnePlanning = async ({ planning, machine, machineInfo, currentTime, currentDay, timeStart, totalTimeWorking, lastGhepKho, transaction, isFirst, }) => {
    const { planningId, runningPlan, ghepKho, Order } = planning;
    const numberChild = Order?.numberChild || 1;
    const flute = Order?.flute || "3B";
    const speed = (0, exports.getSpeed)(flute, machine, machineInfo);
    const performance = machineInfo.machinePerformance;
    const totalLength = runningPlan / numberChild;
    const isSameSize = lastGhepKho && ghepKho === lastGhepKho;
    const changeTime = machine === "Máy Quấn Cuồn"
        ? machineInfo.timeChangeSize
        : isFirst
            ? machineInfo.timeChangeSize
            : isSameSize
                ? machineInfo.timeChangeSameSize
                : machineInfo.timeChangeSize;
    //công thức
    const productionMinutes = Math.ceil((changeTime + totalLength / speed) / (performance / 100));
    // Tính thời gian bắt đầu và kết thúc ca làm việc cho currentDay
    const [h, m] = timeStart.split(":").map(Number);
    let startOfWork = new Date(currentDay);
    startOfWork.setHours(h, m, 0, 0);
    let endOfWork = new Date(startOfWork);
    endOfWork.setHours(startOfWork.getHours() + totalTimeWorking);
    // Nếu currentTime < start → set currentTime = start
    if (currentTime < startOfWork) {
        currentTime = new Date(startOfWork);
    }
    // Nếu currentTime >= end → nhảy sang hôm sau
    if (currentTime >= endOfWork) {
        currentDay.setDate(currentDay.getDate() + 1);
        startOfWork.setDate(startOfWork.getDate() + 1);
        endOfWork.setDate(endOfWork.getDate() + 1);
        currentTime = new Date(startOfWork);
    }
    let endTime = new Date(currentTime);
    endTime.setMinutes(endTime.getMinutes() + productionMinutes);
    const extraBreak = (0, exports.isDuringBreak)(currentTime, endTime);
    const predictedEnd = new Date(currentTime);
    predictedEnd.setMinutes(predictedEnd.getMinutes() + productionMinutes + extraBreak);
    const hasOverFlow = predictedEnd > endOfWork;
    const result = await (0, exports.handleOverflow)({
        hasOverFlow,
        predictedEnd,
        endOfWork,
        planningId,
        currentDay,
        timeStart,
        transaction,
    });
    await planningPaper_1.PlanningPaper.update({
        dayStart: new Date(result.dayStart),
        timeRunning: result.timeRunning,
        hasOverFlow,
    }, { where: { planningId }, transaction });
    // console.log("🔍 [Tính toán đơn hàng]:", {
    //   planningId,
    //   status: planning.status,
    //   lastGhepKho,
    //   isSameSize,
    //   changeTime: `${changeTime} phút`,
    //   productionTime: `${productionMinutes} phút`,
    //   breakTime: `${extraBreak} phút`,
    //   predictedEndTime: formatTime(predictedEnd),
    //   endOfWorkTime: formatTime(endOfWork),
    //   hasOverFlow,
    //   overflowDayStart: hasOverFlow ? result.overflowDayStart : null,
    //   overflowTimeRunning: hasOverFlow ? result.overflowTimeRunning : null,
    //   timeRunningForPlanning: result.timeRunning,
    // });
    return { result, nextTime: result.nextTime, nextDay: result.nextDay, ghepKho };
};
exports.calculateTimeForOnePlanning = calculateTimeForOnePlanning;
//==================== HỖ TRỢ ====================//
const getSpeed = (flute, machine, info) => {
    const layer = parseInt(flute?.[0] ?? "0", 10);
    if (machine === "Máy 2 Lớp")
        return info.speed2Layer;
    if (machine === "Máy Quấn Cuồn")
        return info.paperRollSpeed;
    const key = `speed${layer}Layer`;
    const speed = info[key];
    if (!speed) {
        throw new Error(`Không tìm thấy tốc độ cho flute=${flute}`);
    }
    return speed;
};
exports.getSpeed = getSpeed;
const isDuringBreak = (start, end) => {
    const breaks = [
        { start: "11:30", end: "12:00", duration: 30 },
        { start: "17:00", end: "17:30", duration: 30 },
        { start: "02:00", end: "02:45", duration: 45 },
    ];
    return breaks.reduce((total, b) => {
        const [sh, sm] = b.start.split(":").map(Number);
        const [eh, em] = b.end.split(":").map(Number);
        const s = new Date(start);
        s.setHours(sh, sm, 0, 0);
        const e = new Date(start);
        e.setHours(eh, em, 0, 0);
        if (e <= s)
            e.setDate(e.getDate() + 1);
        return end > s && start < e ? total + b.duration : total;
    }, 0);
};
exports.isDuringBreak = isDuringBreak;
const handleOverflow = async ({ hasOverFlow, predictedEnd, endOfWork, planningId, currentDay, timeStart, transaction, }) => {
    if (!hasOverFlow) {
        await timeOverflowPlanning_1.timeOverflowPlanning.destroy({ where: { planningId }, transaction });
        return {
            dayStart: currentDay.toISOString().split("T")[0],
            timeRunning: (0, exports.formatTime)(predictedEnd),
            nextTime: predictedEnd,
            nextDay: currentDay,
        };
    }
    const overflowMin = (predictedEnd.getTime() - endOfWork.getTime()) / 60000;
    const overflowDay = new Date(currentDay);
    overflowDay.setDate(overflowDay.getDate() + 1);
    const startOverflow = (0, exports.parseTime)(timeStart);
    startOverflow.setDate(startOverflow.getDate() + 1);
    const overflowEnd = new Date(startOverflow);
    overflowEnd.setMinutes(overflowEnd.getMinutes() + overflowMin);
    await timeOverflowPlanning_1.timeOverflowPlanning.destroy({ where: { planningId }, transaction });
    await timeOverflowPlanning_1.timeOverflowPlanning.create({
        planningId,
        overflowDayStart: new Date(overflowDay.toISOString().split("T")[0]),
        overflowTimeRunning: (0, exports.formatTime)(overflowEnd),
    }, { transaction });
    return {
        dayStart: currentDay.toISOString().split("T")[0],
        timeRunning: (0, exports.formatTime)(endOfWork),
        nextTime: overflowEnd,
        nextDay: overflowDay,
    };
};
exports.handleOverflow = handleOverflow;
const parseTime = (t) => {
    const [h, m] = t.split(":").map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
};
exports.parseTime = parseTime;
const formatTime = (d) => {
    const pad = (n) => n.toString().padStart(2, "0");
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};
exports.formatTime = formatTime;
const combineDateAndHHMMSS = (dateObj, hhmmss) => {
    const [h, m, s = 0] = hhmmss.split(":").map(Number);
    const d = new Date(dateObj);
    d.setHours(h, m, s, 0);
    return d;
};
exports.combineDateAndHHMMSS = combineDateAndHHMMSS;
const getInitialCursor = async ({ machine, dayStart, timeStart, transaction, }) => {
    const day = new Date(dayStart);
    const dayStr = day.toISOString().split("T")[0];
    // Bắt đầu với base = dayStart + timeStart
    const baseTime = (0, exports.parseTime)(timeStart);
    baseTime.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());
    let currentTime = baseTime;
    let currentDay = new Date(day);
    let lastGhepKho = null;
    // A) Kiểm tra đơn complete trong cùng ngày
    const lastComplete = await planningPaper_1.PlanningPaper.findOne({
        where: { chooseMachine: machine, status: "complete", dayStart: dayStr },
        order: [["timeRunning", "DESC"]],
        attributes: ["timeRunning", "ghepKho"],
        transaction,
    });
    if (lastComplete?.timeRunning) {
        const completeTime = (0, exports.combineDateAndHHMMSS)(currentDay, lastComplete.timeRunning);
        if (completeTime > currentTime) {
            currentTime = completeTime;
            lastGhepKho = lastComplete.ghepKho ?? lastGhepKho;
        }
    }
    // B) Kiểm tra overflow mới nhất (ưu tiên cao hơn)
    const lastOverflow = await timeOverflowPlanning_1.timeOverflowPlanning.findOne({
        include: [
            {
                model: planningPaper_1.PlanningPaper,
                attributes: ["status", "ghepKho", "chooseMachine"],
                where: { chooseMachine: machine, status: "complete" },
                required: true,
            },
        ],
        order: [
            ["overflowDayStart", "DESC"],
            ["overflowTimeRunning", "DESC"],
        ],
        transaction,
    });
    if (lastOverflow?.overflowTimeRunning) {
        const overflowDay = new Date(lastOverflow.overflowDayStart ?? "");
        const overflowTime = (0, exports.combineDateAndHHMMSS)(overflowDay, lastOverflow.overflowTimeRunning);
        // Nếu overflow mới hơn currentTime → cập nhật cursor
        if (overflowTime > currentTime) {
            currentTime = overflowTime;
            currentDay = overflowDay;
            lastGhepKho = lastOverflow.PlanningPaper?.ghepKho ?? lastGhepKho;
        }
    }
    // C) Trả về con trỏ cuối cùng
    return { currentTime, currentDay, lastGhepKho };
};
exports.getInitialCursor = getInitialCursor;
//# sourceMappingURL=timeRunningService.js.map