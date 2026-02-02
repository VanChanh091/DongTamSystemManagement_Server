"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calTimeRunningPlanningBox = void 0;
const wasteNormBox_1 = require("../../../models/admin/wasteNormBox");
const planningBox_1 = require("../../../models/planning/planningBox");
const planningBoxMachineTime_1 = require("../../../models/planning/planningBoxMachineTime");
const timeOverflowPlanning_1 = require("../../../models/planning/timeOverflowPlanning");
const planningRepository_1 = require("../../../repository/planningRepository");
const planningHelper_1 = require("../../../utils/helper/modelHelper/planningHelper");
// công thức:
// Nếu là máy in thì totalTime = thời gian in + time
// Ngược lại totalTime = thời gian lên bài + time
// Trong đó:
// time = tổng dài / (tốc độ máy / 60)
// Thời gian in = thời gian lên bài * số màu trước & sau
// Tổng dài = tổng sl khách đặt / số con
// Tốc độ máy: tốc độ máy theo lớp giấy (mét/phút) -> lấy từ thông số máy
// Thời gian lên bài: lấy từ thông số máy
//công thức tính waste:
//Nếu là máy in -> c * (inMatTruoc + inMatSau) + runningPlan * (totalLossOnTotalQty / 100)
//ngược lại -> p + runningPlan * (totalLossOnTotalQty / 100)
//ký hiệu: c = colorNumberOnProduct, p = paperNumberOnProduct
// Tính thời gian cho danh sách planning
const calTimeRunningPlanningBox = async ({ plannings, machine, machineInfo, dayStart, timeStart, totalTimeWorking, isNewDay, transaction, }) => {
    const updated = [];
    let currentDay, currentTime;
    if (isNewDay) {
        currentDay = new Date(dayStart);
        const [hh, mm] = timeStart.split(":").map(Number);
        currentTime = new Date(currentDay);
        currentTime.setHours(hh, mm, 0, 0);
    }
    else {
        // ✅ Ưu tiên lấy đơn complete từ FE gửi xuống
        const feComplete = plannings
            .filter((p) => p.boxTimes && p.boxTimes[0] && p.boxTimes[0].status === "complete")
            .sort((a, b) => new Date(b.boxTimes[0].dayStart).getTime() - new Date(a.boxTimes[0].dayStart).getTime())[0];
        if (feComplete) {
            const feBox = feComplete.boxTimes[0];
            if (feComplete.hasOverFlow) {
                // Lấy overflow mới nhất cho planning này & machine
                const overflowRecord = await planningRepository_1.planningRepository.getModelById({
                    model: timeOverflowPlanning_1.timeOverflowPlanning,
                    where: { planningBoxId: feComplete.planningBoxId, machine },
                    options: { transaction },
                });
                if (overflowRecord &&
                    overflowRecord.overflowDayStart &&
                    overflowRecord.overflowTimeRunning) {
                    currentDay = new Date(overflowRecord.overflowDayStart);
                    currentTime = combineDateAndHHMMSS(currentDay, overflowRecord.overflowTimeRunning);
                }
                else if (feBox && feBox.dayStart && feBox.timeRunning) {
                    currentDay = new Date(feBox.dayStart);
                    currentTime = combineDateAndHHMMSS(currentDay, feBox.timeRunning);
                }
                else if (feComplete.dayStart && feComplete.timeRunning) {
                    currentDay = new Date(feComplete.dayStart);
                    currentTime = combineDateAndHHMMSS(currentDay, feComplete.timeRunning);
                }
                else {
                    const initCursor = await getInitialCursor({
                        machine,
                        dayStart,
                        timeStart,
                        transaction,
                    });
                    currentTime = initCursor.currentTime;
                    currentDay = initCursor.currentDay;
                }
            }
            else {
                // không overflow -> ưu tiên boxTime, fallback planning
                if (feBox && feBox.dayStart && feBox.timeRunning) {
                    currentDay = new Date(feBox.dayStart);
                    currentTime = combineDateAndHHMMSS(currentDay, feBox.timeRunning);
                }
                else {
                    currentDay = new Date(feComplete.dayStart);
                    currentTime = combineDateAndHHMMSS(currentDay, feComplete.timeRunning);
                }
            }
        }
        else {
            // fallback: lấy con trỏ từ DB
            const initCursor = await getInitialCursor({ machine, dayStart, timeStart, transaction });
            ({ currentTime, currentDay } = initCursor);
        }
    }
    for (const planning of plannings) {
        const boxTime = planning.boxTimes && planning.boxTimes[0] ? planning.boxTimes[0] : null;
        if (boxTime && boxTime.status === "complete")
            continue;
        const data = await calculateTimeForOnePlanning({
            planning: planning,
            machine,
            machineInfo,
            currentTime,
            currentDay,
            timeStart,
            totalTimeWorking,
            transaction,
        });
        currentTime = data.nextTime;
        currentDay = data.nextDay;
        updated.push(data.result);
    }
    return updated;
};
exports.calTimeRunningPlanningBox = calTimeRunningPlanningBox;
// Tính thời gian cho từng planning (sửa để ngày/giờ luôn đồng bộ)
const calculateTimeForOnePlanning = async ({ planning, machine, machineInfo, currentTime, currentDay, timeStart, totalTimeWorking, transaction, }) => {
    const { planningBoxId, sortPlanning, Order, status } = planning;
    const isMayIn = machine.includes("Máy In");
    //chặn update đơn complete
    if (status === "complete") {
        return {
            result: { planningBoxId, skipped: true, status },
            nextTime: currentTime,
            nextDay: currentDay,
        };
    }
    // chỉ dùng quantityCustomer làm runningPlan
    const boxTime = planning.boxTimes && planning.boxTimes[0] ? planning.boxTimes[0] : null;
    const runningPlan = boxTime.runningPlan;
    const productionMinutes = calculateProductionMinutes({
        runningPlan,
        Order,
        machineInfo,
        isMayIn,
    });
    // --- logic giữ nguyên ---
    const { startOfWorkTime: rawStart, endOfWorkTime: rawEnd } = (0, planningHelper_1.getWorkShift)(currentDay, timeStart, totalTimeWorking);
    const startOfWorkTime = (0, planningHelper_1.setTimeOnDay)(currentDay, rawStart);
    const endOfWorkTime = (0, planningHelper_1.setTimeOnDay)(currentDay, rawEnd);
    currentTime = (0, planningHelper_1.setTimeOnDay)(currentDay, currentTime);
    if (currentTime < startOfWorkTime) {
        currentTime = (0, planningHelper_1.setTimeOnDay)(currentDay, startOfWorkTime);
    }
    if (currentTime >= endOfWorkTime) {
        const nextDay = (0, planningHelper_1.addDays)(currentDay, 1);
        const nextStart = (0, planningHelper_1.setTimeOnDay)(nextDay, timeStart);
        return await calculateTimeForOnePlanning({
            planning,
            machine,
            machineInfo,
            currentTime: nextStart,
            currentDay: nextDay,
            timeStart,
            totalTimeWorking,
            transaction,
        });
    }
    let result = {
        planningBoxId,
        dayStart: currentDay.toISOString().split("T")[0],
    };
    let hasOverFlow = false;
    // predictedEndTime: đã bao gồm productionMinutes + toàn bộ break
    const predictedEndTime = (0, planningHelper_1.addMinutes)(currentTime, productionMinutes);
    console.log(predictedEndTime > endOfWorkTime);
    if (predictedEndTime > endOfWorkTime) {
        hasOverFlow = true;
        result.timeRunning = (0, planningHelper_1.formatTimeToHHMMSS)(endOfWorkTime);
        const overflowData = await handleOverflow({
            planningBoxId,
            sortPlanning,
            predictedEndTime,
            endOfWorkTime,
            timeStart,
            currentDay,
            machine,
            transaction,
        });
        Object.assign(result, overflowData);
        result.hasOverFlow = true;
        currentDay = new Date(overflowData.overflowDayStart);
        currentTime = (0, planningHelper_1.setTimeOnDay)(currentDay, overflowData.overflowTimeRunning);
    }
    else {
        result.timeRunning = (0, planningHelper_1.formatTimeToHHMMSS)(predictedEndTime);
        currentTime = predictedEndTime;
        await planningRepository_1.planningRepository.deleteModelData({
            model: timeOverflowPlanning_1.timeOverflowPlanning,
            where: { planningBoxId, machine },
            transaction,
        });
    }
    console.log(`hasOverFlow: ${hasOverFlow}`);
    console.log(`hasOverFlow && runningPlan > 0: ${hasOverFlow && runningPlan > 0}`);
    await planningRepository_1.planningRepository.updateDataModel({
        model: planningBox_1.PlanningBox,
        data: { hasOverFlow: hasOverFlow && runningPlan > 0 },
        options: { where: { planningBoxId }, transaction },
    });
    // tính waste
    const wasteBoxValue = await calculateWasteBoxValue({
        machine,
        runningPlan,
        Order,
        isMayIn,
        transaction,
    });
    if (wasteBoxValue !== null) {
        result.wasteBox = Math.round(wasteBoxValue);
    }
    await planningRepository_1.planningRepository.updateDataModel({
        model: planningBoxMachineTime_1.PlanningBoxTime,
        data: { ...result, sortPlanning },
        options: { where: { planningBoxId, machine }, transaction },
    });
    // ================== LOG CHI TIẾT ==================
    // console.log("PlanningBox", {
    //   machine,
    //   runningPlan,
    //   totalTimeWorking,
    //   shift: {
    //     startOfWorkTime: formatTimeToHHMMSS(startOfWorkTime),
    //     endOfWorkTime: formatTimeToHHMMSS(endOfWorkTime),
    //   },
    //   productionMinutes,
    //   breakMinutes: isDuringBreak(startForLog, predictedEndTime),
    //   result,
    // });
    // console.log("========================================");
    return { result, nextTime: currentTime, nextDay: currentDay };
};
// Tính phút sản xuất (có log)
const calculateProductionMinutes = ({ runningPlan, Order, machineInfo, isMayIn, }) => {
    if (runningPlan <= 0)
        return 0;
    const numberChild = Order?.numberChild || 1;
    const totalLength = runningPlan / numberChild;
    const totalTime = totalLength / (machineInfo.speedOfMachine / 60);
    const box = Order?.box.dataValues;
    if (isMayIn && box) {
        const { inMatTruoc = 0, inMatSau = 0 } = box;
        return Math.ceil(machineInfo.timeToProduct * (inMatTruoc + inMatSau) + totalTime);
    }
    return Math.ceil(machineInfo.timeToProduct + totalTime);
};
// Xử lý overflow
const handleOverflow = async ({ planningBoxId, predictedEndTime, endOfWorkTime, timeStart, currentDay, machine, transaction, }) => {
    const overflowMinutes = (predictedEndTime.getTime() - endOfWorkTime.getTime()) / 60000;
    const overflowDayStart = (0, planningHelper_1.formatDate)((0, planningHelper_1.addDays)(currentDay, 1));
    const overflowTimeRunning = (0, planningHelper_1.formatTimeToHHMMSS)((0, planningHelper_1.addMinutes)((0, planningHelper_1.parseTimeOnly)(timeStart), overflowMinutes));
    await planningRepository_1.planningRepository.deleteModelData({
        model: timeOverflowPlanning_1.timeOverflowPlanning,
        where: { planningBoxId, machine },
        transaction,
    });
    await planningRepository_1.planningRepository.createData({
        model: timeOverflowPlanning_1.timeOverflowPlanning,
        data: {
            planningBoxId,
            machine,
            overflowDayStart: new Date(overflowDayStart),
            overflowTimeRunning,
        },
        transaction,
    });
    return {
        overflowDayStart,
        overflowTimeRunning,
        overflowMinutes: `${Math.round(overflowMinutes)} phút`,
    };
};
// Tính waste
const calculateWasteBoxValue = async ({ machine, runningPlan, Order, isMayIn, transaction, }) => {
    if (runningPlan <= 0)
        return null;
    const wasteNorm = await planningRepository_1.planningRepository.getModelById({
        model: wasteNormBox_1.WasteNormBox,
        where: { machineName: machine },
        options: { transaction },
    });
    if (!wasteNorm)
        return null;
    const { colorNumberOnProduct = 0, paperNumberOnProduct = 0, totalLossOnTotalQty = 0, } = wasteNorm.get();
    const box = Order?.box.dataValues;
    const c = colorNumberOnProduct ?? 0;
    const p = paperNumberOnProduct ?? 0;
    if (isMayIn && box) {
        const { inMatTruoc = 0, inMatSau = 0 } = box;
        return c * (inMatTruoc + inMatSau) + runningPlan * (totalLossOnTotalQty / 100);
    }
    return p + runningPlan * (totalLossOnTotalQty / 100);
};
const combineDateAndHHMMSS = (dateObj, hhmmss) => {
    const [h, m, s = 0] = hhmmss.split(":").map((x) => Number(x) || 0);
    const d = new Date(dateObj);
    d.setHours(h, m, s || 0, 0);
    return d;
};
const getInitialCursor = async ({ machine, dayStart, timeStart, transaction, }) => {
    const day = new Date(dayStart);
    const dayStr = day.toISOString().split("T")[0];
    // 1) base = dayStart + timeStart
    const base = (0, planningHelper_1.parseTimeOnly)(timeStart);
    base.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());
    let currentTime = base;
    let currentDay = new Date(day);
    // A) Lấy đơn complete trong cùng ngày
    const lastComplete = await planningRepository_1.planningRepository.getModelById({
        model: planningBoxMachineTime_1.PlanningBoxTime,
        where: { machine: machine, status: "complete", dayStart: dayStr },
        options: { order: [["timeRunning", "DESC"]], attributes: ["timeRunning"], transaction },
    });
    if (lastComplete?.timeRunning) {
        const time = combineDateAndHHMMSS(currentDay, lastComplete.timeRunning);
        if (time > currentTime) {
            currentTime = time;
        }
    }
    // B) Lấy overflow từ hôm trước hoặc hôm nay
    const lastOverflow = await planningRepository_1.planningRepository.getTimeOverflowBox(machine, transaction);
    if (lastOverflow?.overflowTimeRunning) {
        const overflowDay = new Date(lastOverflow.overflowDayStart ?? "");
        const overflowTime = combineDateAndHHMMSS(overflowDay, lastOverflow.overflowTimeRunning);
        // Nếu overflow mới hơn currentTime → cập nhật cursor
        if (overflowTime > currentTime) {
            currentTime = overflowTime;
            currentDay = overflowDay;
        }
    }
    return { currentTime, currentDay };
};
//# sourceMappingURL=timeRunningBox.js.map