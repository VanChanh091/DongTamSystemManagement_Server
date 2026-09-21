"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.planningBoxService = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const sequelize_1 = require("sequelize");
const meiliService_1 = require("../system/meiliService");
const appError_1 = require("../../utils/appError");
const labelFields_1 = require("../../assets/labelFields");
const machineBox_1 = require("../../models/admin/machineBox");
const cacheKey_1 = require("../../utils/helper/cache/cacheKey");
const planningBox_1 = require("../../models/planning/planningBox");
const redis_connect_1 = __importDefault(require("../../assets/configs/connect/redis.connect"));
const timeRunningBox_1 = require("./helper/timeRunningBox");
const cacheManager_1 = require("../../utils/helper/cache/cacheManager");
const transactionHelper_1 = require("../../utils/helper/transactionHelper");
const meilisearch_connect_1 = require("../../assets/configs/connect/meilisearch.connect");
const timeOverflowPlanning_1 = require("../../models/planning/timeOverflowPlanning");
const meiliTransformer_1 = require("../../assets/configs/meilisearch/meiliTransformer");
const planningBoxRepository_1 = require("../../repository/planning/planningBoxRepository");
const planningBoxMachineTime_1 = require("../../models/planning/planningBoxMachineTime");
const crud_helper_repository_1 = require("../../repository/helper/crud.helper.repository");
const devEnvironment = process.env.NODE_ENV !== "production";
const { box } = cacheKey_1.CacheKey.planning;
const filterStatus = ["planning", "lackOfQty", "producing", "requested"];
exports.planningBoxService = {
    getPlanningBox: async (machine) => {
        try {
            const cacheKey = box.machine(machine);
            const { isChanged } = await cacheManager_1.CacheManager.check([
                { model: planningBox_1.PlanningBox },
                { model: planningBoxMachineTime_1.PlanningBoxTime },
                { model: timeOverflowPlanning_1.timeOverflowPlanning, where: { planningBoxId: { [sequelize_1.Op.ne]: null } } },
            ], "planningBox");
            if (isChanged) {
                await cacheManager_1.CacheManager.clear("planningBox");
            }
            else {
                const cachedData = await redis_connect_1.default.get(cacheKey);
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
            await redis_connect_1.default.set(cacheKey, JSON.stringify(planning), "EX", 1800);
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
            const data = await planningBoxRepository_1.planningBoxRepository.getAllPlanningBox({ machine });
            // Phân loại withSort và noSort
            const withSort = data.filter((item) => item.boxTimes?.some((bt) => bt.sortPlanning !== null));
            const noSort = data.filter((item) => !item.boxTimes?.some((bt) => bt.sortPlanning !== null));
            // Sắp xếp withSort theo sortPlanning (dùng sortPlanning đầu tiên trong boxTimes)
            withSort.sort((a, b) => {
                const sortA = a.boxTimes?.find((bt) => bt.sortPlanning !== null)?.sortPlanning ?? 0;
                const sortB = b.boxTimes?.find((bt) => bt.sortPlanning !== null)?.sortPlanning ?? 0;
                return sortA - sortB;
            });
            // Sắp xếp noSort theo flute (ưu tiên sóng)
            noSort.sort((a, b) => {
                const wavePriorityMap = {
                    C: 3,
                    B: 2,
                    E: 1,
                };
                const getWavePriorityList = (flute) => {
                    if (!flute || flute.length < 2)
                        return [];
                    const waves = flute.trim().slice(1).toUpperCase().split("");
                    return waves.map((w) => wavePriorityMap[w] || 0);
                };
                const waveA = getWavePriorityList(a.Order?.flute ?? "");
                const waveB = getWavePriorityList(b.Order?.flute ?? "");
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
            // 4. Gộp đơn overflow nếu có
            const allPlannings = [];
            sortedPlannings.forEach((planning) => {
                const original = {
                    ...planning.toJSON(),
                    // dayStart: planning.boxTimes?.[0].dayStart ?? null,
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
        try {
            const validFields = ["orderId", "customerName", "QC_box"];
            if (!validFields.includes(field)) {
                throw appError_1.AppError.BadRequest(`Field '${field}' is not supported for search`, "INVALID_FIELD");
            }
            const index = meilisearch_connect_1.meiliClient.index("planningBoxes");
            const searchResult = await index.search(keyword, {
                attributesToSearchOn: [field],
                attributesToRetrieve: ["planningBoxId"],
                filter: `boxTimes.machine = "${machine}" AND boxTimes.status IN ${JSON.stringify(filterStatus)}`,
                limit: 100,
            });
            const planningBoxIdsArr = searchResult.hits.map((hit) => hit.planningBoxId);
            if (!planningBoxIdsArr || planningBoxIdsArr.length === 0) {
                return { message: "No planning boxes found", data: [] };
            }
            //query db
            const fullData = await planningBoxRepository_1.planningBoxRepository.getAllPlanningBox({
                whereCondition: { planningBoxId: { [sequelize_1.Op.in]: planningBoxIdsArr } },
                machine,
            });
            // Sắp xếp lại thứ tự của SQL theo đúng thứ tự của Meilisearch
            const finalData = planningBoxIdsArr
                .map((id) => fullData.find((p) => p.planningBoxId === id))
                .filter(Boolean);
            return {
                message: `Search by ${field} from Meilisearch & DB`,
                data: finalData,
            };
        }
        catch (error) {
            console.error(`Failed to get customers by ${field}`, error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    completePlanningBox: async (planningBoxId, machine) => {
        return await exports.planningBoxService._updateStatusBox(planningBoxId, machine, "complete", (boxTimes) => {
            // Kiểm tra sl từng đơn
            for (const box of boxTimes) {
                const { qtyProduced, runningPlan } = box;
                if ((qtyProduced ?? 0) < (runningPlan ?? 0)) {
                    throw appError_1.AppError.BadRequest("Thiếu số lượng sản xuất", "LACK_QUANTITY");
                }
                if (box.status !== "requested") {
                    throw appError_1.AppError.BadRequest(`Đơn ${box.PlanningBox.orderId} chưa được yêu cầu hoàn thành`, "PLANNING_NOT_REQUESTED");
                }
            }
        });
    },
    _updateStatusBox: async (planningBoxId, machine, targetStatus, extraValidator) => {
        return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
            const ids = Array.isArray(planningBoxId) ? planningBoxId : [planningBoxId];
            const boxTimes = await planningBoxRepository_1.planningBoxRepository.getBoxsById({
                planningBoxIds: ids,
                machine,
                options: {
                    attributes: ["runningPlan", "qtyProduced", "status", "machine"],
                    include: [
                        {
                            model: planningBox_1.PlanningBox,
                            attributes: ["planningBoxId", "hasOverFlow", "orderId"],
                        },
                    ],
                    transaction,
                },
            });
            if (boxTimes.length !== ids.length) {
                throw appError_1.AppError.BadRequest("planning not found", "PLANNING_NOT_FOUND");
            }
            // Thực thi validator riêng
            extraValidator(boxTimes);
            //cập nhật status planning
            await crud_helper_repository_1.CrudHelper.updateData({
                model: planningBoxMachineTime_1.PlanningBoxTime,
                data: { status: targetStatus },
                options: { where: { planningBoxId: ids, machine }, transaction },
            });
            const overflowRows = await timeOverflowPlanning_1.timeOverflowPlanning.findAll({
                where: { planningBoxId: ids, machine },
                transaction,
            });
            if (overflowRows.length > 0) {
                await crud_helper_repository_1.CrudHelper.updateData({
                    model: timeOverflowPlanning_1.timeOverflowPlanning,
                    data: { status: targetStatus },
                    options: { where: { planningBoxId: ids, machine }, transaction },
                });
            }
            //--------------------MEILISEARCH-----------------------
            const fullBox = await planningBoxRepository_1.planningBoxRepository.syncPlanningBoxToMeili({
                whereCondition: { planningBoxId: { [sequelize_1.Op.in]: ids } },
            });
            if (fullBox.length > 0) {
                const flattenData = fullBox.map(meiliTransformer_1.meiliTransformer.planningBox);
                await meiliService_1.meiliService.syncOrUpdateMeiliData({
                    indexKey: labelFields_1.MEILI_INDEX.PLANNING_BOXES,
                    data: flattenData,
                    transaction,
                });
            }
            return { message: `Planning status updated to ${targetStatus}`, ids };
        });
    },
    acceptLackQtyBox: async (planningBoxIds, newStatus, machine) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const plannings = await planningBoxRepository_1.planningBoxRepository.getBoxsById({
                    planningBoxIds,
                    machine,
                    options: { transaction },
                });
                if (plannings.length === 0) {
                    throw appError_1.AppError.NotFound("planning not found", "PLANNING_NOT_FOUND");
                }
                for (const planning of plannings) {
                    if (planning.sortPlanning === null) {
                        throw appError_1.AppError.Conflict("Không thể hoàn thành đơn hàng chưa được sắp xếp", "CANNOT_PAUSE_NO_SORT");
                    }
                    if (planning.status !== "requested") {
                        throw appError_1.AppError.BadRequest(`Có đơn hàng chưa được yêu cầu hoàn thành`, "PLANNING_NOT_REQUESTED");
                    }
                    planning.status = newStatus;
                    await planning.save({ transaction });
                    await crud_helper_repository_1.CrudHelper.updateData({
                        model: timeOverflowPlanning_1.timeOverflowPlanning,
                        data: { status: newStatus },
                        options: { where: { planningBoxId: planning.planningBoxId, machine }, transaction },
                    });
                }
                //--------------------MEILISEARCH-----------------------
                const fullBox = await planningBoxRepository_1.planningBoxRepository.syncPlanningBoxToMeili({
                    whereCondition: { planningBoxId: { [sequelize_1.Op.in]: planningBoxIds } },
                    transaction,
                });
                if (fullBox.length > 0) {
                    const flattenData = fullBox.map(meiliTransformer_1.meiliTransformer.planningBox);
                    await meiliService_1.meiliService.syncOrUpdateMeiliData({
                        indexKey: labelFields_1.MEILI_INDEX.PLANNING_BOXES,
                        data: flattenData,
                        transaction,
                    });
                }
                return { message: `Update status:${newStatus} successfully.` };
            });
        }
        catch (error) {
            console.error("❌ accept lack qty failed:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    updateIndex_TimeRunningBox: async ({ machine, updateIndex, dayStart, timeStart, totalTimeWorking, isNewDay, }) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                // 1. Cập nhật sortPlanning
                for (const item of updateIndex) {
                    if (!item.sortPlanning)
                        continue;
                    const boxTime = await crud_helper_repository_1.CrudHelper.findOne({
                        model: planningBoxMachineTime_1.PlanningBoxTime,
                        where: {
                            planningBoxId: item.planningBoxId,
                            machine,
                            status: { [sequelize_1.Op.ne]: "complete" }, //lọc bỏ đơn đã complete
                        },
                        options: { transaction },
                    });
                    if (boxTime) {
                        await crud_helper_repository_1.CrudHelper.updateData({
                            model: boxTime,
                            data: { sortPlanning: item.sortPlanning },
                            options: { transaction },
                        });
                    }
                }
                // 2. Lấy lại danh sách planning đã được update
                const sortedPlannings = await planningBoxRepository_1.planningBoxRepository.getBoxesByUpdateIndex(updateIndex, machine, transaction);
                // console.log(
                //   sortedPlannings.map((p) => ({ id: p.planningBoxId, sort: p.boxTimes?.[0]?.sortPlanning }))
                // );
                // 3. Tính toán thời gian chạy cho từng planning
                const machineInfo = await crud_helper_repository_1.CrudHelper.findOne({
                    model: machineBox_1.MachineBox,
                    where: { machineName: machine },
                    options: { transaction },
                });
                if (!machineInfo)
                    throw appError_1.AppError.NotFound(`machine not found`, "MACHINE_NOT_FOUND");
                // 4. Tính toán thời gian chạy
                const updatedPlannings = await (0, timeRunningBox_1.calTimeRunningPlanningBox)({
                    plannings: sortedPlannings,
                    machineInfo: machineInfo,
                    machine,
                    dayStart,
                    timeStart,
                    totalTimeWorking,
                    isNewDay,
                    transaction,
                });
                return {
                    message: "✅ Cập nhật sortPlanning + tính thời gian thành công",
                    data: updatedPlannings,
                };
            });
        }
        catch (error) {
            console.error("❌ update index & time running failed:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
};
//# sourceMappingURL=planningBoxService.js.map