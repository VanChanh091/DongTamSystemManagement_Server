"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.planningBoxService = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const cacheManager_1 = require("../../utils/helper/cacheManager");
const planningRepository_1 = require("../../repository/planningRepository");
const redisCache_1 = __importDefault(require("../../configs/redisCache"));
const appError_1 = require("../../utils/appError");
const planningBox_1 = require("../../models/planning/planningBox");
const planningBoxMachineTime_1 = require("../../models/planning/planningBoxMachineTime");
const timeOverflowPlanning_1 = require("../../models/planning/timeOverflowPlanning");
const sequelize_1 = require("sequelize");
const machineBox_1 = require("../../models/admin/machineBox");
const timeRunningBox_1 = require("./helper/timeRunningBox");
const planningHelper_1 = require("../../utils/helper/modelHelper/planningHelper");
const devEnvironment = process.env.NODE_ENV !== "production";
const { box } = cacheManager_1.CacheManager.keys.planning;
exports.planningBoxService = {
    //Planning Box
    getPlanningBox: async (machine) => {
        try {
            if (!machine) {
                throw appError_1.AppError.BadRequest("Missing machine parameter", "MISSING_PARAMETERS");
            }
            const cacheKey = box.machine(machine);
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
                    return {
                        message: `get filtered cached planning:box:machine:${machine}`,
                        data: JSON.parse(cachedData),
                    };
                }
            }
            const planning = await exports.planningBoxService.getPlanningBoxSorted(machine);
            await redisCache_1.default.set(cacheKey, JSON.stringify(planning), "EX", 1800);
            return { message: `get planning by machine: ${machine}`, data: planning };
        }
        catch (error) {
            console.error("❌ get planning box failed:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    //sort planning
    getPlanningBoxSorted: async (machine) => {
        try {
            const data = await planningRepository_1.planningRepository.getAllPlanningBox({ machine });
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
    },
    getPlanningBoxByField: async (machine, field, keyword) => {
        console.log(`machine ${machine} - field: ${field} - keyword: ${keyword}`);
        try {
            const fieldMap = {
                orderId: (paper) => paper.orderId,
                customerName: (paper) => paper.Order.Customer.customerName,
                QcBox: (paper) => paper.Order.flute,
            };
            const key = field;
            if (!key || !fieldMap[key]) {
                throw appError_1.AppError.BadRequest("Invalid field parameter", "INVALID_FIELD");
            }
            const result = await (0, planningHelper_1.getPlanningByField)({
                cacheKey: box.search(machine),
                keyword,
                getFieldValue: fieldMap[key],
                whereCondition: { machine, status: { [sequelize_1.Op.ne]: "stop" } },
                message: `get all by ${field} from filtered cache`,
                isBox: true,
            });
            const planningBoxIdsArr = result.data.map((p) => p.planningBoxId);
            console.log(planningBoxIdsArr);
            if (!planningBoxIdsArr || planningBoxIdsArr.length === 0) {
                return {
                    ...result,
                    data: [],
                };
            }
            const fullData = await planningRepository_1.planningRepository.getAllPlanningBox({
                whereCondition: { planningBoxId: planningBoxIdsArr },
                machine,
            });
            return { ...result, data: fullData };
            // return result;
        }
        catch (error) {
            console.error(`Failed to get customers by ${field}`, error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    getPlanningBoxByOrderId: async (machine, orderId) => {
        try {
            if (!machine || !orderId) {
                throw appError_1.AppError.BadRequest("Missing machine or orderId parameter", "MISSING_PARAMETERS");
            }
            const cacheKey = box.machine(machine);
            const cachedData = await redisCache_1.default.get(cacheKey);
            if (cachedData) {
                if (devEnvironment)
                    console.log("✅ Data planning from Redis");
                const parsedData = JSON.parse(cachedData);
                // Tìm kiếm tương đối trong cache
                const filteredData = parsedData.filter((item) => {
                    return item.orderId?.toLowerCase().includes(orderId.toLowerCase());
                });
                return { message: "Get planning by orderId from cache", data: filteredData };
            }
            const planning = await planningRepository_1.planningRepository.getBoxsByOrderId(orderId);
            if (!planning || planning.length === 0) {
                throw appError_1.AppError.NotFound(`Không tìm thấy kế hoạch chứa: ${orderId}`, "PLANNING_NOT_FOUND");
            }
            return { message: "Get planning by orderId from db", data: planning };
        }
        catch (error) {
            console.error("❌ get planning box by id failed:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    acceptLackQtyBox: async (planningBoxIds, newStatus, machine) => {
        try {
            if (!Array.isArray(planningBoxIds) || planningBoxIds.length === 0) {
                throw appError_1.AppError.BadRequest("Missing planningBoxIds parameter", "MISSING_PARAMETERS");
            }
            const plannings = await planningRepository_1.planningRepository.getBoxsById(planningBoxIds, machine);
            if (plannings.length === 0) {
                throw appError_1.AppError.NotFound("planning not found", "PLANNING_NOT_FOUND");
            }
            for (const planning of plannings) {
                if (planning.sortPlanning === null) {
                    throw appError_1.AppError.Conflict("Cannot pause planning without sortPlanning", "CANNOT_PAUSE_NO_SORT");
                }
                planning.status = newStatus;
                await planning.save();
                await planningRepository_1.planningRepository.updateDataModel(timeOverflowPlanning_1.timeOverflowPlanning, { status: newStatus }, { where: { planningBoxId: planning.planningBoxId } });
            }
            return { message: `Update status:${newStatus} successfully.` };
        }
        catch (error) {
            console.error("❌ accept lack qty failed:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    updateIndex_TimeRunningBox: async ({ req, machine, updateIndex, dayStart, timeStart, totalTimeWorking, }) => {
        const transaction = await planningBox_1.PlanningBox.sequelize?.transaction();
        try {
            if (!Array.isArray(updateIndex) || updateIndex.length === 0) {
                throw appError_1.AppError.BadRequest("Missing updateIndex parameter", "MISSING_PARAMETERS");
            }
            // 1. Cập nhật sortPlanning
            for (const item of updateIndex) {
                if (!item.sortPlanning)
                    continue;
                const boxTime = await planningRepository_1.planningRepository.getModelById(planningBoxMachineTime_1.PlanningBoxTime, {
                    planningBoxId: item.planningBoxId,
                    machine,
                    status: { [sequelize_1.Op.ne]: "complete" }, //không cập nhật đơn đã complete
                }, { transaction });
                if (boxTime) {
                    planningRepository_1.planningRepository.updateDataModel(boxTime, { sortPlanning: item.sortPlanning }, { transaction });
                }
            }
            // 2. Lấy lại danh sách planning đã được update
            const sortedPlannings = await planningRepository_1.planningRepository.getBoxesByUpdateIndex(updateIndex, machine, transaction);
            // 3. Tính toán thời gian chạy cho từng planning
            const machineInfo = await planningRepository_1.planningRepository.getModelById(machineBox_1.MachineBox, {
                machineName: machine,
            });
            if (!machineInfo)
                throw appError_1.AppError.NotFound(`machine not found`, "MACHINE_NOT_FOUND");
            const updatedPlannings = await (0, timeRunningBox_1.calTimeRunningPlanningBox)({
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
            return {
                message: "✅ Cập nhật sortPlanning + tính thời gian thành công",
                data: updatedPlannings,
            };
        }
        catch (error) {
            console.error("❌ update index & time running failed:", error);
            await transaction?.rollback();
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
};
//# sourceMappingURL=planningBoxService.js.map