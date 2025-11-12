"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateIndex_TimeRunningBox = exports.acceptLackQtyBox = exports.getPlanningBoxByQcBox = exports.getPlanningBoxByFlute = exports.getPlanningBoxByCusName = exports.getPlanningBoxByOrderId = exports.getPlanningBox = void 0;
const sequelize_1 = require("sequelize");
const order_1 = require("../../../models/order/order");
const customer_1 = require("../../../models/customer/customer");
const box_1 = require("../../../models/order/box");
const planningBox_1 = require("../../../models/planning/planningBox");
const timeOverflowPlanning_1 = require("../../../models/planning/timeOverflowPlanning");
const planningBoxMachineTime_1 = require("../../../models/planning/planningBoxMachineTime");
const machineBox_1 = require("../../../models/admin/machineBox");
const wasteNormBox_1 = require("../../../models/admin/wasteNormBox");
const planningHelper_1 = require("../../../utils/helper/modelHelper/planningHelper");
const cacheManager_1 = require("../../../utils/helper/cacheManager");
const redisCache_1 = __importDefault(require("../../../configs/redisCache"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const devEnvironment = process.env.NODE_ENV !== "production";
//get all planning box
const getPlanningBox = async (req, res) => {
    const { machine } = req.query;
    if (!machine) {
        return res.status(400).json({ message: "Missing 'machine' query parameter" });
    }
    const { box } = cacheManager_1.CacheManager.keys.planning;
    const cacheKey = box.machine(machine);
    try {
        const { isChanged } = await cacheManager_1.CacheManager.check([
            { model: planningBox_1.PlanningBox },
            { model: planningBoxMachineTime_1.PlanningBoxTime },
            { model: timeOverflowPlanning_1.timeOverflowPlanning, where: { planningBoxId: { [sequelize_1.Op.ne]: null } } },
        ], "planningBox");
        if (isChanged) {
            await cacheManager_1.CacheManager.clearPlanningBox();
        }
        else {
            const cachedData = await redisCache_1.default.get(cacheKey);
            if (cachedData) {
                if (devEnvironment)
                    console.log("✅ Data PlanningBox from Redis");
                return res.json({
                    message: `get filtered cached planning:box:machine:${machine}`,
                    data: JSON.parse(cachedData),
                });
            }
        }
        const planning = await getPlanningByMachineSorted(machine);
        await redisCache_1.default.set(cacheKey, JSON.stringify(planning), "EX", 1800);
        return res.status(200).json({
            message: `get planning by machine: ${machine}`,
            data: planning,
        });
    }
    catch (error) {
        console.error("error", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
exports.getPlanningBox = getPlanningBox;
//sort planning
const getPlanningByMachineSorted = async (machine) => {
    try {
        const data = await planningBox_1.PlanningBox.findAll({
            attributes: {
                exclude: [
                    "hasIn",
                    "hasBe",
                    "hasXa",
                    "hasDan",
                    "hasCanLan",
                    "hasCatKhe",
                    "hasCanMang",
                    "hasDongGhim",
                    "createdAt",
                    "updatedAt",
                ],
            },
            include: [
                {
                    model: planningBoxMachineTime_1.PlanningBoxTime,
                    where: { machine: machine },
                    as: "boxTimes",
                    attributes: { exclude: ["createdAt", "updatedAt"] },
                },
                {
                    model: planningBoxMachineTime_1.PlanningBoxTime,
                    as: "allBoxTimes",
                    where: {
                        machine: { [sequelize_1.Op.ne]: machine },
                    },
                    attributes: {
                        exclude: [
                            "timeRunning",
                            "dayStart",
                            "dayCompleted",
                            "wasteBox",
                            "shiftManagement",
                            "status",
                            "sortPlanning",
                            "createdAt",
                            "updatedAt",
                            "rpWasteLoss",
                        ],
                    },
                },
                {
                    model: timeOverflowPlanning_1.timeOverflowPlanning,
                    as: "timeOverFlow",
                    required: false,
                    where: { machine: machine },
                    attributes: { exclude: ["createdAt", "updatedAt"] },
                },
                {
                    model: order_1.Order,
                    attributes: [
                        "orderId",
                        "dayReceiveOrder",
                        "flute",
                        "QC_box",
                        "numberChild",
                        "dateRequestShipping",
                        "customerId",
                        "productId",
                        "quantityCustomer",
                    ],
                    include: [
                        {
                            model: customer_1.Customer,
                            attributes: ["customerName", "companyName"],
                        },
                        {
                            model: box_1.Box,
                            as: "box",
                            attributes: { exclude: ["createdAt", "updatedAt"] },
                        },
                    ],
                },
            ],
        });
        //lọc đơn complete trong 3 ngày
        const truncateToDate = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const now = truncateToDate(new Date());
        const validData = data.filter((planning) => {
            const boxTimes = planning.boxTimes || [];
            const hasValidStatus = boxTimes.some((bt) => ["planning", "lackOfQty", "producing"].includes(bt.status));
            const hasRecentComplete = boxTimes.some((bt) => {
                if (bt.status !== "complete" || !bt.dayCompleted)
                    return false;
                const dayCompleted = new Date(bt.dayCompleted);
                if (isNaN(dayCompleted.getTime()))
                    return false;
                const expiredDate = truncateToDate(dayCompleted);
                expiredDate.setDate(expiredDate.getDate() + 3);
                return expiredDate >= now;
            });
            return hasValidStatus || hasRecentComplete;
        });
        // 3. Phân loại withSort và noSort
        const withSort = validData.filter((item) => item.boxTimes?.some((bt) => bt.sortPlanning !== null));
        const noSort = validData.filter((item) => !item.boxTimes?.some((bt) => bt.sortPlanning !== null));
        // Sắp xếp withSort theo sortPlanning (dùng sortPlanning đầu tiên trong boxTimes)
        withSort.sort((a, b) => {
            const sortA = a.boxTimes?.find((bt) => bt.sortPlanning !== null)?.sortPlanning ?? 0;
            const sortB = b.boxTimes?.find((bt) => bt.sortPlanning !== null)?.sortPlanning ?? 0;
            return sortA - sortB;
        });
        // Sắp xếp noSort theo flute (ưu tiên sóng)
        noSort.sort((a, b) => {
            const wavePriorityMap = { C: 3, B: 2, E: 1 };
            const getWavePriorityList = (flute) => {
                if (!flute)
                    return [];
                return flute
                    .toUpperCase()
                    .replace(/[^A-Z]/g, "")
                    .split("")
                    .map((w) => wavePriorityMap[w] ?? 0);
            };
            const waveA = getWavePriorityList(a.Order?.flute);
            const waveB = getWavePriorityList(b.Order?.flute);
            for (let i = 0; i < Math.max(waveA.length, waveB.length); i++) {
                const priA = waveA[i] ?? 0;
                const priB = waveB[i] ?? 0;
                if (priB !== priA)
                    return priB - priA;
            }
            return 0;
        });
        const sortedPlannings = [...withSort, ...noSort];
        // 4. Gộp đơn overflow nếu có
        const allPlannings = [];
        sortedPlannings.forEach((planning) => {
            const original = {
                ...planning.toJSON(),
                dayStart: planning.boxTimes?.[0].dayStart ?? null,
            };
            allPlannings.push(original);
            if (planning.timeOverFlow && planning.timeOverFlow.length > 0) {
                planning.timeOverFlow.forEach((of) => {
                    const overflowPlanning = {
                        ...original,
                        boxTimes: (planning.boxTimes || []).map((bt) => ({
                            ...bt.toJSON(),
                            dayStart: of.overflowDayStart,
                            dayCompleted: of.overflowDayCompleted,
                            timeRunning: of.overflowTimeRunning,
                        })),
                    };
                    allPlannings.push(overflowPlanning);
                });
            }
        });
        return allPlannings;
    }
    catch (error) {
        console.error("Error fetching planning by machine:", error.message);
        throw error;
    }
};
//get by orderId
const getPlanningBoxByOrderId = async (req, res) => {
    const { orderId, machine } = req.query;
    if (!machine || !orderId) {
        return res.status(400).json({ message: "Thiếu machine hoặc orderId" });
    }
    const { box } = cacheManager_1.CacheManager.keys.planning;
    const cacheKey = box.machine(machine);
    try {
        const cachedData = await redisCache_1.default.get(cacheKey);
        if (cachedData) {
            if (devEnvironment)
                console.log("✅ Data planning from Redis");
            const parsedData = JSON.parse(cachedData);
            // Tìm kiếm tương đối trong cache
            const filteredData = parsedData.filter((item) => {
                return item.orderId?.toLowerCase().includes(orderId.toLowerCase());
            });
            return res.json({
                message: "Get planning by orderId from cache",
                data: filteredData,
            });
        }
        const planning = await planningBox_1.PlanningBox.findAll({
            where: {
                orderId: {
                    [sequelize_1.Op.like]: `%${orderId}%`,
                },
            },
        });
        if (!planning || planning.length === 0) {
            return res.status(404).json({
                message: `Không tìm thấy kế hoạch với orderId chứa: ${orderId}`,
            });
        }
        return res.status(200).json({
            message: "Get planning by orderId from db",
            data: planning,
        });
    }
    catch (error) {
        console.error("❌ Lỗi khi tìm orderId:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};
exports.getPlanningBoxByOrderId = getPlanningBoxByOrderId;
//get by customer name
const getPlanningBoxByCusName = async (req, res) => (0, planningHelper_1.getPlanningBoxByField)(req, res, "customerName");
exports.getPlanningBoxByCusName = getPlanningBoxByCusName;
//get by flute
const getPlanningBoxByFlute = async (req, res) => (0, planningHelper_1.getPlanningBoxByField)(req, res, "flute");
exports.getPlanningBoxByFlute = getPlanningBoxByFlute;
//get by ghepKho
const getPlanningBoxByQcBox = async (req, res) => (0, planningHelper_1.getPlanningBoxByField)(req, res, "QC_box");
exports.getPlanningBoxByQcBox = getPlanningBoxByQcBox;
const acceptLackQtyBox = async (req, res) => {
    const { planningBoxIds, newStatus, machine } = req.body;
    if (!Array.isArray(planningBoxIds) || planningBoxIds.length === 0) {
        return res.status(400).json({ message: "Missing or invalid planningIds" });
    }
    try {
        const plannings = await planningBoxMachineTime_1.PlanningBoxTime.findAll({
            where: {
                planningBoxId: {
                    [sequelize_1.Op.in]: planningBoxIds,
                },
                machine: machine,
            },
        });
        if (plannings.length === 0) {
            return res.status(404).json({ message: "No planning found" });
        }
        for (const planning of plannings) {
            if (planning.sortPlanning === null) {
                return res.status(400).json({
                    message: "Cannot pause planning without sortPlanning",
                });
            }
            planning.status = newStatus;
            await planning.save();
            await timeOverflowPlanning_1.timeOverflowPlanning.update({ status: newStatus }, { where: { planningBoxId: planning.planningBoxId } });
        }
        res.status(200).json({
            message: `Update status:${newStatus} successfully.`,
        });
    }
    catch (error) {
        if (devEnvironment)
            console.log("error pause planning", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
exports.acceptLackQtyBox = acceptLackQtyBox;
//update index planning
const updateIndex_TimeRunningBox = async (req, res) => {
    const { machine, updateIndex, dayStart, timeStart, totalTimeWorking } = req.body;
    if (!Array.isArray(updateIndex) || updateIndex.length === 0) {
        return res.status(400).json({ message: "Missing or invalid updateIndex" });
    }
    const transaction = await planningBox_1.PlanningBox.sequelize?.transaction();
    try {
        // 1. Cập nhật sortPlanning
        for (const item of updateIndex) {
            if (!item.sortPlanning)
                continue;
            const boxTime = await planningBoxMachineTime_1.PlanningBoxTime.findOne({
                where: {
                    planningBoxId: item.planningBoxId,
                    machine,
                    status: { [sequelize_1.Op.ne]: "complete" }, //không cập nhật đơn đã complete
                },
                transaction,
            });
            if (boxTime) {
                await boxTime.update({ sortPlanning: item.sortPlanning }, { transaction });
            }
        }
        // 2. Lấy lại danh sách planning đã được update
        const sortedPlannings = await planningBox_1.PlanningBox.findAll({
            where: { planningBoxId: updateIndex.map((i) => i.planningBoxId) },
            include: [
                { model: timeOverflowPlanning_1.timeOverflowPlanning, as: "timeOverFlow" },
                { model: planningBoxMachineTime_1.PlanningBoxTime, as: "boxTimes", where: { machine } },
                {
                    model: order_1.Order,
                    include: [{ model: box_1.Box, as: "box", attributes: ["inMatTruoc", "inMatSau"] }],
                },
            ],
            order: [[{ model: planningBoxMachineTime_1.PlanningBoxTime, as: "boxTimes" }, "sortPlanning", "ASC"]],
            transaction,
        });
        // 3. Tính toán thời gian chạy cho từng planning
        const machineInfo = await machineBox_1.MachineBox.findOne({
            where: { machineName: machine },
            transaction,
        });
        if (!machineInfo)
            throw new Error("Machine not found");
        const updatedPlannings = await calculateTimeRunningPlannings({
            plannings: sortedPlannings,
            machineInfo: machineInfo,
            machine,
            dayStart,
            timeStart,
            totalTimeWorking,
            transaction,
        });
        await transaction?.commit();
        //socket
        const roomName = `machine_${machine.toLowerCase().replace(/\s+/g, "_")}`;
        req.io?.to(roomName).emit("planningBoxUpdated", {
            machine,
            message: `Kế hoạch của ${machine} đã được cập nhật.`,
        });
        return res.status(200).json({
            message: "✅ Cập nhật sortPlanning + tính thời gian thành công",
            data: updatedPlannings,
        });
    }
    catch (error) {
        await transaction?.rollback();
        console.error("❌ Update failed:", error);
        return res.status(500).json({ message: "❌ Lỗi khi cập nhật", error: error.message });
    }
};
exports.updateIndex_TimeRunningBox = updateIndex_TimeRunningBox;
// Tính thời gian cho danh sách planning
const calculateTimeRunningPlannings = async ({ machine, machineInfo, dayStart, timeStart, totalTimeWorking, plannings, transaction, }) => {
    const updated = [];
    let currentTime, currentDay;
    // ✅ Ưu tiên lấy đơn complete từ FE gửi xuống
    const feComplete = plannings
        .filter((p) => p.boxTimes && p.boxTimes[0] && p.boxTimes[0].status === "complete")
        .sort((a, b) => new Date(b.boxTimes[0].dayStart).getTime() - new Date(a.boxTimes[0].dayStart).getTime())[0];
    if (feComplete) {
        const feBox = feComplete.boxTimes[0];
        if (feComplete.hasOverFlow) {
            // Lấy overflow mới nhất cho planning này & machine
            const overflowRecord = await timeOverflowPlanning_1.timeOverflowPlanning.findOne({
                where: { planningBoxId: feComplete.planningBoxId, machine },
                transaction,
            });
            if (overflowRecord && overflowRecord.overflowDayStart && overflowRecord.overflowTimeRunning) {
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
        const initCursor = await getInitialCursor({
            machine,
            dayStart,
            timeStart,
            transaction,
        });
        currentTime = initCursor.currentTime;
        currentDay = initCursor.currentDay;
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
    // ✅ chỉ dùng quantityCustomer làm runningPlan
    const runningPlan = Order?.quantityCustomer || 0;
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
    const tempEndTime = (0, planningHelper_1.addMinutes)(currentTime, productionMinutes);
    const extraBreak = (0, planningHelper_1.isDuringBreak)(currentTime, tempEndTime);
    const predictedEndTime = (0, planningHelper_1.addMinutes)(currentTime, productionMinutes + extraBreak);
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
        await timeOverflowPlanning_1.timeOverflowPlanning.destroy({ where: { planningBoxId, machine }, transaction });
    }
    // ✅ update hasOverFlow theo quantityCustomer
    await planningBox_1.PlanningBox.update({ hasOverFlow: hasOverFlow && runningPlan > 0 }, { where: { planningBoxId }, transaction });
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
    await planningBoxMachineTime_1.PlanningBoxTime.update({ ...result, sortPlanning }, { where: { planningBoxId, machine }, transaction });
    // ================== LOG CHI TIẾT ==================
    // console.log(
    //   "PlanningBox",
    //   JSON.stringify(
    //     {
    //       machine,
    //       status: planning.status,
    //       runningPlan,
    //       sortPlanning,
    //       totalTimeWorking,
    //       shift: {
    //         startOfWorkTime: formatTimeToHHMMSS(startOfWorkTime),
    //         endOfWorkTime: formatTimeToHHMMSS(endOfWorkTime),
    //       },
    //       productionMinutes,
    //       breakMinutes: extraBreak,
    //       result,
    //     },
    //     null,
    //     2
    //   )
    // );
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
const handleOverflow = async ({ planningBoxId, sortPlanning, predictedEndTime, endOfWorkTime, timeStart, currentDay, machine, transaction, }) => {
    const overflowMinutes = (predictedEndTime.getTime() - endOfWorkTime.getTime()) / 60000;
    const overflowDayStart = (0, planningHelper_1.formatDate)((0, planningHelper_1.addDays)(currentDay, 1));
    const overflowTimeRunning = (0, planningHelper_1.formatTimeToHHMMSS)((0, planningHelper_1.addMinutes)((0, planningHelper_1.parseTimeOnly)(timeStart), overflowMinutes));
    await timeOverflowPlanning_1.timeOverflowPlanning.destroy({
        where: { planningBoxId, machine },
        transaction,
    });
    await timeOverflowPlanning_1.timeOverflowPlanning.create({
        planningBoxId,
        machine,
        overflowDayStart: new Date(overflowDayStart),
        overflowTimeRunning,
    }, { transaction });
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
    const wasteNorm = await wasteNormBox_1.WasteNormBox.findOne({
        where: { machineName: machine },
        transaction,
    });
    if (!wasteNorm)
        return null;
    const { colorNumberOnProduct = 0, paperNumberOnProduct = 0, totalLossOnTotalQty = 0, } = wasteNorm.get();
    const box = Order?.box.dataValues;
    const c = colorNumberOnProduct ?? 0;
    const p = paperNumberOnProduct ?? 0;
    if (isMayIn && box) {
        const { inMatTruoc = 0, inMatSau = 0 } = box;
        return c * inMatTruoc + c * inMatSau + runningPlan * (totalLossOnTotalQty / 100);
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
    let base = (0, planningHelper_1.parseTimeOnly)(timeStart);
    base.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());
    let currentTime = base;
    let currentDay = new Date(day);
    // A) Lấy đơn complete trong cùng ngày
    const lastComplete = await planningBoxMachineTime_1.PlanningBoxTime.findOne({
        where: { machine: machine, status: "complete", dayStart: dayStr },
        order: [["timeRunning", "DESC"]],
        attributes: ["timeRunning"],
        transaction,
    });
    if (lastComplete?.timeRunning) {
        const time = combineDateAndHHMMSS(currentDay, lastComplete.timeRunning);
        if (time > currentTime) {
            currentTime = time;
        }
    }
    // B) Lấy overflow từ hôm trước hoặc hôm nay
    const lastOverflow = await timeOverflowPlanning_1.timeOverflowPlanning.findOne({
        include: [
            {
                model: planningBox_1.PlanningBox,
                include: [
                    {
                        model: planningBoxMachineTime_1.PlanningBoxTime,
                        as: "boxTimes",
                        where: { machine: machine, status: "complete" },
                        attributes: ["status", "machine"],
                        required: true,
                    },
                ],
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
        const time = combineDateAndHHMMSS(overflowDay, lastOverflow.overflowTimeRunning);
        if (time > currentTime) {
            currentTime = time;
        }
    }
    return { currentTime, currentDay };
};
//# sourceMappingURL=planningBoxController.js.map