"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.planningPaperService = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const redisCache_1 = __importDefault(require("../../assest/configs/redisCache"));
const sequelize_1 = require("sequelize");
const order_1 = require("../../models/order/order");
const planningPaper_1 = require("../../models/planning/planningPaper");
const timeOverflowPlanning_1 = require("../../models/planning/timeOverflowPlanning");
const appError_1 = require("../../utils/appError");
const cacheManager_1 = require("../../utils/helper/cacheManager");
const planningRepository_1 = require("../../repository/planningRepository");
const planningBox_1 = require("../../models/planning/planningBox");
const planningBoxMachineTime_1 = require("../../models/planning/planningBoxMachineTime");
const machinePaper_1 = require("../../models/admin/machinePaper");
const timeRunningPaper_1 = require("./helper/timeRunningPaper");
const planningHelper_1 = require("../../utils/helper/modelHelper/planningHelper");
const transactionHelper_1 = require("../../utils/helper/transactionHelper");
const devEnvironment = process.env.NODE_ENV !== "production";
const { paper } = cacheManager_1.CacheManager.keys.planning;
exports.planningPaperService = {
    //====================================PLANNING PAPER========================================
    getPlanningByMachine: async (machine) => {
        try {
            const cacheKey = paper.machine(machine);
            const { isChanged } = await cacheManager_1.CacheManager.check([
                { model: planningPaper_1.PlanningPaper },
                { model: timeOverflowPlanning_1.timeOverflowPlanning, where: { planningId: { [sequelize_1.Op.ne]: null } } },
            ], "planningPaper");
            if (isChanged) {
                await cacheManager_1.CacheManager.clearPlanningPaper();
            }
            else {
                const cachedData = await redisCache_1.default.get(cacheKey);
                if (cachedData) {
                    if (devEnvironment)
                        console.log("✅ Data PlanningPaper from Redis");
                    return {
                        message: `get all cache planning:machine:${machine}`,
                        data: JSON.parse(cachedData),
                    };
                }
            }
            const data = await exports.planningPaperService.getPlanningPaperSorted(machine);
            await redisCache_1.default.set(cacheKey, JSON.stringify(data), "EX", 1800);
            return { message: `get planning by machine: ${machine}`, data };
        }
        catch (error) {
            console.error("❌ get planning paper by machine failed:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    //get sort planning
    getPlanningPaperSorted: async (machine) => {
        try {
            const data = await planningRepository_1.planningRepository.getPlanningPaper({
                whereCondition: {
                    chooseMachine: machine,
                    status: { [sequelize_1.Op.ne]: "stop" },
                },
            });
            //lọc đơn complete trong 3 ngày
            const truncateToDate = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const now = truncateToDate(new Date());
            const validData = data.filter((planning) => {
                if (["planning", "lackQty", "producing"].includes(planning.status))
                    return true;
                if (planning.status === "complete") {
                    const dayCompleted = planning.dayCompleted ? new Date(planning.dayCompleted) : null;
                    if (!dayCompleted || isNaN(dayCompleted.getTime()))
                        return false;
                    const expiredDate = truncateToDate(new Date(dayCompleted));
                    expiredDate.setDate(expiredDate.getDate() + 3);
                    return expiredDate >= now;
                }
                return false;
            });
            const withSort = validData.filter((item) => item.sortPlanning !== null);
            const noSort = validData.filter((item) => item.sortPlanning === null);
            // Sắp xếp đơn có sortPlanning theo thứ tự được lưu
            withSort.sort((a, b) => (a.sortPlanning ?? 0) - (b.sortPlanning ?? 0));
            // Sắp xếp đơn chưa có sortPlanning theo logic yêu cầu
            noSort.sort((a, b) => {
                const wavePriorityMap = {
                    C: 3,
                    B: 2,
                    E: 1,
                };
                //5BC -> 5
                const getLayer = (flute) => {
                    if (!flute || flute.length < 1)
                        return 0;
                    return parseInt(flute.trim()[0]) || 0;
                };
                //5BC -> BC [2,3]
                const getWavePriorityList = (flute) => {
                    if (!flute || flute.length < 2)
                        return [];
                    const waves = flute.trim().slice(1).toUpperCase().split("");
                    return waves.map((w) => wavePriorityMap[w] || 0);
                };
                //compare ghepKho -> layer (5BC -> 5) -> letter (5BC -> BC)
                const ghepA = a.ghepKho ?? 0;
                const ghepB = b.ghepKho ?? 0;
                if (ghepB !== ghepA)
                    return ghepB - ghepA;
                const layerA = getLayer(a.Order.flute ?? "");
                const layerB = getLayer(b.Order.flute ?? "");
                if (layerB !== layerA)
                    return layerB - layerA;
                const waveA = getWavePriorityList(a.Order.flute ?? "");
                const waveB = getWavePriorityList(b.Order.flute ?? "");
                const maxLength = Math.max(waveA.length, waveB.length);
                for (let i = 0; i < maxLength; i++) {
                    const priA = waveA[i] ?? 0;
                    const priB = waveB[i] ?? 0;
                    if (priB !== priA)
                        return priB - priA;
                }
                return 0;
            });
            const sortedPlannings = [...withSort, ...noSort];
            //Gộp overflow vào liền sau đơn gốc
            const allPlannings = [];
            const overflowRemoveFields = ["runningPlan", "quantityManufacture"];
            sortedPlannings.forEach((planning) => {
                const original = {
                    ...planning.toJSON(),
                    timeRunning: planning.timeRunning,
                    dayStart: planning.dayStart,
                };
                allPlannings.push(original);
                if (planning.timeOverFlow) {
                    const overflow = { ...planning.toJSON() };
                    overflow.isOverflow = true;
                    overflow.dayStart = planning.timeOverFlow.overflowDayStart;
                    overflow.timeRunning = planning.timeOverFlow.overflowTimeRunning;
                    overflow.dayCompleted = planning.timeOverFlow.overflowDayCompleted;
                    overflowRemoveFields.forEach((f) => delete overflow[f]);
                    if (overflow.Order) {
                        ["quantityManufacture", "totalPrice", "totalPriceVAT"].forEach((item) => delete overflow.Order[item]);
                    }
                    allPlannings.push(overflow);
                }
            });
            return allPlannings;
        }
        catch (error) {
            console.error("Error fetching planning by machine:", error);
            throw appError_1.AppError.ServerError();
        }
    },
    getPlanningByField: async (machine, field, keyword) => {
        try {
            const fieldMap = {
                orderId: (paper) => paper.orderId,
                ghepKho: (paper) => paper.ghepKho,
                customerName: (paper) => paper.Order.Customer.customerName,
            };
            const key = field;
            if (!key || !fieldMap[key]) {
                throw appError_1.AppError.BadRequest("Invalid field parameter", "INVALID_FIELD");
            }
            const result = await (0, planningHelper_1.getPlanningByField)({
                cacheKey: paper.search(machine),
                keyword,
                getFieldValue: fieldMap[key],
                whereCondition: { chooseMachine: machine, status: { [sequelize_1.Op.ne]: "stop" } },
                message: `get all by ${field} from filtered cache`,
            });
            const planningIdsArr = result.data.map((p) => p.planningId);
            if (!planningIdsArr || planningIdsArr.length === 0) {
                return {
                    ...result,
                    data: [],
                };
            }
            const fullData = await planningRepository_1.planningRepository.getPlanningPaper({
                whereCondition: { planningId: planningIdsArr },
            });
            return { ...result, data: fullData };
        }
        catch (error) {
            console.error(`Failed to get customers by ${field}`, error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    changeMachinePlanning: async (planningIds, newMachine) => {
        try {
            const plannings = await planningRepository_1.planningRepository.getPapersById({ planningIds });
            if (plannings.length === 0) {
                throw appError_1.AppError.NotFound("planning not found", "PLANNING_NOT_FOUND");
            }
            for (const planning of plannings) {
                planning.chooseMachine = newMachine;
                planning.sortPlanning = null;
                await planning.save();
            }
            return { message: "Change machine complete", plannings };
        }
        catch (error) {
            console.error("❌ change machine failed:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    confirmCompletePlanningPaper: async (planningId) => {
        try {
            const ids = Array.isArray(planningId) ? planningId : [planningId];
            const planningPaper = await planningRepository_1.planningRepository.getPapersById({
                planningIds: ids,
                options: {
                    attributes: [
                        "planningId",
                        "runningPlan",
                        "qtyProduced",
                        "status",
                        "hasOverFlow",
                        "orderId",
                        "statusRequest",
                    ],
                },
            });
            if (planningPaper.length !== ids.length) {
                throw appError_1.AppError.BadRequest("planning not found", "PLANNING_NOT_FOUND");
            }
            // Kiểm tra sl từng đơn
            for (const paper of planningPaper) {
                const { qtyProduced, runningPlan } = paper;
                if ((qtyProduced ?? 0) < runningPlan) {
                    throw appError_1.AppError.BadRequest("Lack quantity", "LACK_QUANTITY");
                }
                //check đã nhập kho chưa
                if (paper.statusRequest !== "finalize") {
                    throw appError_1.AppError.BadRequest(`Mã đơn ${paper.orderId} chưa được chốt nhập kho`, "PLANNING_NOT_FINALIZED");
                }
            }
            //cập nhật status planning
            await planningRepository_1.planningRepository.updateDataModel({
                model: planningPaper_1.PlanningPaper,
                data: { status: "complete" },
                options: { where: { planningId: ids } },
            });
            const overflowRows = await timeOverflowPlanning_1.timeOverflowPlanning.findAll({
                where: { planningId: ids },
            });
            if (overflowRows.length) {
                await planningRepository_1.planningRepository.updateDataModel({
                    model: timeOverflowPlanning_1.timeOverflowPlanning,
                    data: { status: "complete" },
                    options: { where: { planningId: ids } },
                });
            }
            return { message: "planning paper updated successfully" };
        }
        catch (error) {
            console.log(`error confirm complete planning`, error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    pauseOrAcceptLackQtyPLanning: async (planningIds, newStatus, rejectReason) => {
        try {
            const plannings = await planningRepository_1.planningRepository.getPapersById({ planningIds });
            if (plannings.length === 0) {
                throw appError_1.AppError.NotFound("planning npt found", "PLANNING_NOT_FOUND");
            }
            if (newStatus !== "complete") {
                for (const planning of plannings) {
                    if (planning.orderId) {
                        const order = await planningRepository_1.planningRepository.getModelById({
                            model: order_1.Order,
                            where: { orderId: planning.orderId },
                        });
                        if (order) {
                            //case: cancel planning -> status:reject order
                            //if qtyProduced = 0 -> status:reject order -> delete planning paper&box -> minus debt of customer
                            if (newStatus === "reject") {
                                if ((planning.qtyProduced ?? 0) > 0) {
                                    throw appError_1.AppError.Conflict(`Cannot reject planning ${planning.planningId} has produced quantity.`, "CANNOT_REJECT_PRODUCED_PLANNING");
                                }
                                // Trả order về reject
                                await planningRepository_1.planningRepository.updateDataModel({
                                    model: order,
                                    data: {
                                        status: newStatus,
                                        rejectReason,
                                    },
                                });
                                // Trừ công nợ khách hàng
                                // const customer = await planningRepository.getModelById(
                                //   Customer,
                                //   { customerId: order.customerId },
                                //   { attributes: ["customerId", "debtCurrent"] }
                                // );
                                // if (customer) {
                                //   let debtAfter = (customer.debtCurrent || 0) - order.totalPrice;
                                //   if (debtAfter < 0) debtAfter = 0; //tránh âm tiền
                                //   await planningRepository.updateDataModel(customer, { debtCurrent: debtAfter });
                                // }
                                // Xoá dữ liệu phụ thuộc
                                const dependents = await planningRepository_1.planningRepository.getBoxByPlanningId(planning.planningId);
                                for (const box of dependents) {
                                    await planningRepository_1.planningRepository.deleteModelData({
                                        model: planningBoxMachineTime_1.PlanningBoxTime,
                                        where: { planningBoxId: box.planningBoxId },
                                    });
                                    await box.destroy();
                                }
                                //xóa planning paper
                                await planning.destroy();
                            }
                            //case pause planning -> status:accept or stop order
                            //if qtyProduced = 0 -> delete planning paper&box -> status:accept order
                            //if qtyProduced > 0 -> status:stop order -> status:stop planning paper&box
                            else if (newStatus === "stop") {
                                const dependents = await planningRepository_1.planningRepository.getBoxByPlanningId(planning.planningId);
                                if ((planning.qtyProduced ?? 0) > 0) {
                                    await planningRepository_1.planningRepository.updateDataModel({
                                        model: order,
                                        data: {
                                            status: newStatus,
                                            rejectReason: rejectReason,
                                        },
                                    });
                                    await planningRepository_1.planningRepository.updateDataModel({
                                        model: planning,
                                        data: { status: newStatus },
                                    });
                                    for (const box of dependents) {
                                        await planningRepository_1.planningRepository.updateDataModel({
                                            model: planningBoxMachineTime_1.PlanningBoxTime,
                                            data: { status: newStatus },
                                            options: { where: { planningBoxId: box.planningBoxId } },
                                        });
                                    }
                                }
                                else {
                                    await planningRepository_1.planningRepository.updateDataModel({
                                        model: order,
                                        data: { status: "accept" },
                                    });
                                    for (const box of dependents) {
                                        await planningRepository_1.planningRepository.deleteModelData({
                                            model: planningBoxMachineTime_1.PlanningBoxTime,
                                            where: { planningBoxId: box.planningBoxId },
                                        });
                                        await box.destroy();
                                    }
                                    await planning.destroy();
                                    await cacheManager_1.CacheManager.clearOrderAccept();
                                }
                            }
                        }
                    }
                }
            }
            else {
                // complete -> accept lack of qty
                for (const planning of plannings) {
                    if (planning.sortPlanning === null) {
                        throw appError_1.AppError.BadRequest("Cannot pause planning without sortPlanning", "CANNOT_PAUSE_WITHOUT_SORT");
                    }
                    planning.status = newStatus;
                    await planning.save();
                    if (planning.hasOverFlow) {
                        await planningRepository_1.planningRepository.updateDataModel({
                            model: timeOverflowPlanning_1.timeOverflowPlanning,
                            data: { status: newStatus },
                            options: { where: { planningId: planning.planningId } },
                        });
                    }
                    const planningBox = await planningRepository_1.planningRepository.getModelById({
                        model: planningBox_1.PlanningBox,
                        where: {
                            planningId: planning.planningId,
                        },
                    });
                    if (!planningBox)
                        continue;
                    await planningRepository_1.planningRepository.updateDataModel({
                        model: planningBoxMachineTime_1.PlanningBoxTime,
                        data: { runningPlan: planning.qtyProduced ?? 0 },
                        options: { where: { planningBoxId: planningBox.planningBoxId } },
                    });
                }
            }
            return { message: "Update status planning successfully" };
        }
        catch (error) {
            console.log("error pause or accept planning", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    updateIndex_TimeRunning: async ({ updateIndex, machine, dayStart, timeStart, totalTimeWorking, isNewDay, }) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                // Cập nhật sortPlanning
                await (0, timeRunningPaper_1.updateSortPlanning)(updateIndex, transaction);
                // Lấy lại danh sách đã update
                const plannings = await planningRepository_1.planningRepository.getPapersByUpdateIndex(updateIndex, transaction);
                // Lấy thông tin máy
                const machineInfo = await planningRepository_1.planningRepository.getModelById({
                    model: machinePaper_1.MachinePaper,
                    where: { machineName: machine },
                });
                if (!machineInfo)
                    throw appError_1.AppError.NotFound("Machine not found", "MACHINE_NOT_FOUND");
                // Tính toán thời gian chạy
                const updatedPlannings = await (0, timeRunningPaper_1.calculateTimeRunning)({
                    plannings,
                    machineInfo,
                    machine,
                    dayStart,
                    timeStart,
                    totalTimeWorking,
                    isNewDay,
                    transaction,
                });
                return {
                    message: "Cập nhật sortPlanning + tính thời gian thành công",
                    data: updatedPlannings,
                };
            });
        }
        catch (error) {
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    //planningPaperUpdated or planningBoxUpdated
    notifyUpdatePlanning: async (req, machine, keyName) => {
        try {
            const roomName = `machine_${machine.toLowerCase().replace(/\s+/g, "_")}`;
            req.io?.to(roomName).emit(keyName, {
                machine,
                message: `Kế hoạch của ${machine} đã được cập nhật.`,
            });
            return { message: "Đã gửi thông báo cập nhật kế hoạch" };
        }
        catch (error) {
            console.error("❌Lỗi khi gửi socket:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
};
//# sourceMappingURL=planningPaperService.js.map