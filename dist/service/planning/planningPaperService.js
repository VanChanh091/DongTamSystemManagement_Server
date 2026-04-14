"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.planningPaperService = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const sequelize_1 = require("sequelize");
const appError_1 = require("../../utils/appError");
const order_1 = require("../../models/order/order");
const meiliService_1 = require("../meiliService");
const cacheKey_1 = require("../../utils/helper/cache/cacheKey");
const machinePaper_1 = require("../../models/admin/machinePaper");
const planningBox_1 = require("../../models/planning/planningBox");
const redis_connect_1 = __importDefault(require("../../assets/configs/connect/redis.connect"));
const cacheManager_1 = require("../../utils/helper/cache/cacheManager");
const transactionHelper_1 = require("../../utils/helper/transactionHelper");
const planningHelper_1 = require("../../repository/planning/planningHelper");
const meilisearch_connect_1 = require("../../assets/configs/connect/meilisearch.connect");
const planningBoxMachineTime_1 = require("../../models/planning/planningBoxMachineTime");
const timeOverflowPlanning_1 = require("../../models/planning/timeOverflowPlanning");
const timeRunningPaper_1 = require("./helper/timeRunningPaper");
const planningPaper_1 = require("../../models/planning/planningPaper");
const planningPaperRepository_1 = require("../../repository/planning/planningPaperRepository");
const labelFields_1 = require("../../assets/labelFields");
const excelExporter_1 = require("../../utils/helper/excelExporter");
const customer_1 = require("../../models/customer/customer");
const normalizeVN_1 = require("../../utils/helper/normalizeVN");
const planningPaperRowAndColumn_1 = require("../../utils/mapping/planningPaperRowAndColumn");
const devEnvironment = process.env.NODE_ENV !== "production";
const { paper } = cacheKey_1.CacheKey.planning;
exports.planningPaperService = {
    //====================================PLANNING PAPER========================================
    getPlanningPaperByMachine: async (machine) => {
        try {
            const cacheKey = paper.machine(machine);
            const { isChanged } = await cacheManager_1.CacheManager.check([
                { model: planningPaper_1.PlanningPaper },
                { model: timeOverflowPlanning_1.timeOverflowPlanning, where: { planningId: { [sequelize_1.Op.ne]: null } } },
            ], "planningPaper");
            if (isChanged) {
                await cacheManager_1.CacheManager.clear("planningPaper");
            }
            else {
                const cachedData = await redis_connect_1.default.get(cacheKey);
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
            await redis_connect_1.default.set(cacheKey, JSON.stringify(data), "EX", 1800);
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
            const { rows: data } = await planningPaperRepository_1.planningPaperRepository.getPlanningPaper({
                whereCondition: {
                    chooseMachine: machine,
                    status: { [sequelize_1.Op.ne]: "stop" },
                },
            });
            //lọc đơn complete trong 1 ngày
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
                    expiredDate.setDate(expiredDate.getDate() + 1);
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
                // const wavePriorityMap: Record<"C" | "B" | "E", number> = {
                //   C: 3,
                //   B: 2,
                //   E: 1,
                // };
                //5BC -> 5
                // const getLayer = (flute: string) => {
                //   if (!flute || flute.length < 1) return 0;
                //   return parseInt(flute.trim()[0]) || 0;
                // };
                //5BC -> BC [2,3]
                // const getWavePriorityList = (flute: string) => {
                //   if (!flute || flute.length < 2) return [];
                //   const waves = flute.trim().slice(1).toUpperCase().split("");
                //   return waves.map((w) => wavePriorityMap[w as keyof typeof wavePriorityMap] || 0);
                // };
                //compare ghepKho -> layer (5BC -> 5) -> letter (5BC -> BC)
                const ghepA = a.ghepKho ?? 0;
                const ghepB = b.ghepKho ?? 0;
                if (ghepB !== ghepA)
                    return ghepB - ghepA;
                // const layerA = getLayer(a.Order.flute ?? "");
                // const layerB = getLayer(b.Order.flute ?? "");
                // if (layerB !== layerA) return layerB - layerA;
                // const waveA = getWavePriorityList(a.Order.flute ?? "");
                // const waveB = getWavePriorityList(b.Order.flute ?? "");
                // const maxLength = Math.max(waveA.length, waveB.length);
                // for (let i = 0; i < maxLength; i++) {
                //   const priA = waveA[i] ?? 0;
                //   const priB = waveB[i] ?? 0;
                //   if (priB !== priA) return priB - priA;
                // }
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
            const validFields = ["orderId", "customerName", "ghepKho"];
            if (!validFields.includes(field)) {
                throw appError_1.AppError.BadRequest(`Field '${field}' is not supported for search`, "INVALID_FIELD");
            }
            const index = meilisearch_connect_1.meiliClient.index("planningPapers");
            const searchResult = await index.search(keyword, {
                attributesToSearchOn: [field],
                attributesToRetrieve: ["planningId"],
                filter: `chooseMachine = "${machine}" AND status != "stop"`,
                limit: 100,
            });
            const planningIds = searchResult.hits.map((hit) => hit.planningId);
            if (!planningIds || planningIds.length === 0) {
                return { message: "No planning papers found", data: [] };
            }
            //query db
            const { rows } = await planningPaperRepository_1.planningPaperRepository.getPlanningPaper({
                whereCondition: { planningId: { [sequelize_1.Op.in]: planningIds } },
            });
            // Sắp xếp lại thứ tự của SQL theo đúng thứ tự của Meilisearch
            const finalData = planningIds
                .map((id) => rows.find((p) => p.planningId === id))
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
    changeMachinePlanning: async (planningIds, newMachine) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const plannings = await planningPaperRepository_1.planningPaperRepository.getPapersById({ planningIds });
                if (plannings.length === 0) {
                    throw appError_1.AppError.NotFound("planning not found", "PLANNING_NOT_FOUND");
                }
                for (const planning of plannings) {
                    planning.chooseMachine = newMachine;
                    planning.sortPlanning = null;
                    await planning.save();
                }
                //--------------------MEILISEARCH-----------------------
                const dataForMeili = plannings.map((p) => ({
                    planningId: p.planningId,
                    chooseMachine: newMachine,
                }));
                await meiliService_1.meiliService.syncOrUpdateMeiliData({
                    indexKey: labelFields_1.MEILI_INDEX.PLANNING_PAPERS,
                    data: dataForMeili,
                    transaction,
                    isUpdate: true,
                });
                return { message: "Change machine complete", plannings };
            });
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
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const ids = Array.isArray(planningId) ? planningId : [planningId];
                const planningPaper = await planningPaperRepository_1.planningPaperRepository.getPapersById({
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
                await planningHelper_1.planningHelper.updateDataModel({
                    model: planningPaper_1.PlanningPaper,
                    data: { status: "complete" },
                    options: { where: { planningId: ids } },
                });
                const overflowRows = await timeOverflowPlanning_1.timeOverflowPlanning.findAll({
                    where: { planningId: ids },
                });
                if (overflowRows.length) {
                    await planningHelper_1.planningHelper.updateDataModel({
                        model: timeOverflowPlanning_1.timeOverflowPlanning,
                        data: { status: "complete" },
                        options: { where: { planningId: ids } },
                    });
                }
                //--------------------MEILISEARCH-----------------------
                const dataForMeili = planningPaper.map((p) => ({
                    planningId: p.planningId,
                    status: "complete",
                }));
                await meiliService_1.meiliService.syncOrUpdateMeiliData({
                    indexKey: labelFields_1.MEILI_INDEX.PLANNING_PAPERS,
                    data: dataForMeili,
                    transaction,
                    isUpdate: true,
                });
                return { message: "planning paper updated successfully" };
            });
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
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const plannings = await planningPaperRepository_1.planningPaperRepository.getPapersById({ planningIds });
                if (plannings.length === 0) {
                    throw appError_1.AppError.NotFound("planning npt found", "PLANNING_NOT_FOUND");
                }
                if (newStatus !== "complete") {
                    for (const planning of plannings) {
                        if (planning.orderId) {
                            const order = await planningHelper_1.planningHelper.getModelById({
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
                                    await planningHelper_1.planningHelper.updateDataModel({
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
                                    const dependents = await planningPaperRepository_1.planningPaperRepository.getBoxByPlanningId(planning.planningId);
                                    for (const box of dependents) {
                                        await planningHelper_1.planningHelper.deleteModelData({
                                            model: planningBoxMachineTime_1.PlanningBoxTime,
                                            where: { planningBoxId: box.planningBoxId },
                                        });
                                        await box.destroy();
                                    }
                                    //xóa planning paper
                                    const deletedId = planning.planningId;
                                    await planning.destroy();
                                    //--------------------MEILISEARCH-----------------------
                                    await meiliService_1.meiliService.deleteMeiliData(labelFields_1.MEILI_INDEX.PLANNING_PAPERS, deletedId, transaction);
                                    await meiliService_1.meiliService.syncOrUpdateMeiliData({
                                        indexKey: labelFields_1.MEILI_INDEX.ORDERS,
                                        data: { orderSortValue: order.orderSortValue, status: newStatus },
                                        transaction,
                                        isUpdate: true,
                                    });
                                }
                                //case pause planning -> status:accept or stop order
                                //if qtyProduced = 0 -> delete planning paper&box -> status:accept order
                                //if qtyProduced > 0 -> status:stop order -> status:stop planning paper&box
                                else if (newStatus === "stop") {
                                    const dependents = await planningPaperRepository_1.planningPaperRepository.getBoxByPlanningId(planning.planningId);
                                    if ((planning.qtyProduced ?? 0) > 0) {
                                        await planningHelper_1.planningHelper.updateDataModel({
                                            model: order,
                                            data: {
                                                status: newStatus,
                                                rejectReason: rejectReason,
                                            },
                                        });
                                        await planningHelper_1.planningHelper.updateDataModel({
                                            model: planning,
                                            data: { status: newStatus },
                                        });
                                        for (const box of dependents) {
                                            await planningHelper_1.planningHelper.updateDataModel({
                                                model: planningBoxMachineTime_1.PlanningBoxTime,
                                                data: { status: newStatus },
                                                options: { where: { planningBoxId: box.planningBoxId } },
                                            });
                                        }
                                        //--------------------MEILISEARCH-----------------------
                                        await meiliService_1.meiliService.syncOrUpdateMeiliData({
                                            indexKey: labelFields_1.MEILI_INDEX.PLANNING_PAPERS,
                                            data: { planningId: planning.planningId, status: newStatus },
                                            transaction,
                                            isUpdate: true,
                                        });
                                        await meiliService_1.meiliService.syncOrUpdateMeiliData({
                                            indexKey: labelFields_1.MEILI_INDEX.ORDERS,
                                            data: { orderSortValue: order.orderSortValue, status: newStatus },
                                            transaction,
                                            isUpdate: true,
                                        });
                                    }
                                    else {
                                        await planningHelper_1.planningHelper.updateDataModel({
                                            model: order,
                                            data: { status: "accept" },
                                        });
                                        for (const box of dependents) {
                                            await planningHelper_1.planningHelper.deleteModelData({
                                                model: planningBoxMachineTime_1.PlanningBoxTime,
                                                where: { planningBoxId: box.planningBoxId },
                                            });
                                            await box.destroy();
                                        }
                                        const deletedId = planning.planningId;
                                        await planning.destroy();
                                        await cacheManager_1.CacheManager.clear("orderAccept");
                                        //--------------------MEILISEARCH-----------------------
                                        await meiliService_1.meiliService.deleteMeiliData(labelFields_1.MEILI_INDEX.PLANNING_PAPERS, deletedId, transaction);
                                        await meiliService_1.meiliService.syncOrUpdateMeiliData({
                                            indexKey: labelFields_1.MEILI_INDEX.ORDERS,
                                            data: { orderSortValue: order.orderSortValue, status: "accept" },
                                            transaction,
                                            isUpdate: true,
                                        });
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
                            await planningHelper_1.planningHelper.updateDataModel({
                                model: timeOverflowPlanning_1.timeOverflowPlanning,
                                data: { status: newStatus },
                                options: { where: { planningId: planning.planningId } },
                            });
                        }
                        const planningBox = await planningHelper_1.planningHelper.getModelById({
                            model: planningBox_1.PlanningBox,
                            where: {
                                planningId: planning.planningId,
                            },
                        });
                        if (planningBox) {
                            await planningHelper_1.planningHelper.updateDataModel({
                                model: planningBoxMachineTime_1.PlanningBoxTime,
                                data: { runningPlan: planning.qtyProduced ?? 0 },
                                options: { where: { planningBoxId: planningBox.planningBoxId } },
                            });
                        }
                        //--------------------MEILISEARCH-----------------------
                        await meiliService_1.meiliService.syncOrUpdateMeiliData({
                            indexKey: labelFields_1.MEILI_INDEX.PLANNING_PAPERS,
                            data: { planningId: planning.planningId, status: newStatus },
                            transaction,
                            isUpdate: true,
                        });
                    }
                }
                return { message: "Update status planning successfully" };
            });
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
                const plannings = await planningPaperRepository_1.planningPaperRepository.getPapersByUpdateIndex(updateIndex, transaction);
                // Lấy thông tin máy
                const machineInfo = await planningHelper_1.planningHelper.getModelById({
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
    notifyUpdatePlanning: async ({ req, isPlan, machine, keyName, senderId, }) => {
        try {
            const roomName = `machine_${machine.toLowerCase().replace(/\s+/g, "_")}`;
            let item = {};
            isPlan
                ? (item = {
                    isPlan,
                    from: "Kế hoạch",
                    machine,
                    message: `Kế hoạch cho ${machine} đã được cập nhật.`,
                    senderId,
                })
                : (item = { isPlan, message: `Chỉ định sản xuất cho đơn hàng thành công`, senderId });
            req.io?.to(roomName).emit(keyName, item);
            return { message: "Đã gửi thông báo cập nhật kế hoạch" };
        }
        catch (error) {
            console.error("❌Lỗi khi gửi socket:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    exportExcelPlanningOrder: async (res, machine) => {
        try {
            const data = await planningPaper_1.PlanningPaper.findAll({
                where: {
                    chooseMachine: machine,
                    status: { [sequelize_1.Op.notIn]: ["complete", "stop", "cancel"] },
                    statusRequest: { [sequelize_1.Op.in]: ["none", "requested"] },
                },
                attributes: [
                    "planningId",
                    "dayStart",
                    "dayReplace",
                    "matEReplace",
                    "matBReplace",
                    "matCReplace",
                    "matE2Replace",
                    "songEReplace",
                    "songBReplace",
                    "songCReplace",
                    "songE2Replace",
                    "lengthPaperPlanning",
                    "sizePaperPLaning",
                    "numberChild",
                    "ghepKho",
                ],
                include: [
                    {
                        model: order_1.Order,
                        attributes: ["orderId", "flute", "totalPrice", "instructSpecial"],
                        include: [{ model: customer_1.Customer, attributes: ["customerName"] }],
                    },
                ],
            });
            const safeMachineName = machine.replace(/\s+/g, "-");
            await (0, excelExporter_1.exportExcelResponse)(res, {
                data: data,
                sheetName: "Kế hoạch sản xuất",
                fileName: `KHSX_${(0, normalizeVN_1.normalizeVN)(safeMachineName)}`,
                columns: planningPaperRowAndColumn_1.planningPaperColumns,
                rows: planningPaperRowAndColumn_1.mapPlanningPaperRow,
            });
        }
        catch (error) {
            console.error("Error create inventory:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
};
//# sourceMappingURL=planningPaperService.js.map