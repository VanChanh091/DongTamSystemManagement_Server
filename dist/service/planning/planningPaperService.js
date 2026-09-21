"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.planningPaperService = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const sequelize_1 = require("sequelize");
const meiliService_1 = require("../system/meiliService");
const appError_1 = require("../../utils/appError");
const order_1 = require("../../models/order/order");
const labelFields_1 = require("../../assets/labelFields");
const cacheKey_1 = require("../../utils/helper/cache/cacheKey");
const normalizeVN_1 = require("../../utils/helper/normalizeVN");
const machinePaper_1 = require("../../models/admin/machinePaper");
const planningBox_1 = require("../../models/planning/planningBox");
const redis_connect_1 = __importDefault(require("../../assets/configs/connect/redis.connect"));
const cacheManager_1 = require("../../utils/helper/cache/cacheManager");
const transactionHelper_1 = require("../../utils/helper/transactionHelper");
const meilisearch_connect_1 = require("../../assets/configs/connect/meilisearch.connect");
const planningBoxMachineTime_1 = require("../../models/planning/planningBoxMachineTime");
const timeOverflowPlanning_1 = require("../../models/planning/timeOverflowPlanning");
const timeRunningPaper_1 = require("./helper/timeRunningPaper");
const planningPaper_1 = require("../../models/planning/planningPaper");
const planningPaperRepository_1 = require("../../repository/planning/planningPaperRepository");
const planningPaperRowAndColumn_1 = require("../../utils/mapping/planningPaperRowAndColumn");
const excelExporter_1 = require("../../utils/helper/excelExporter");
const manufactureHelper_1 = require("../../utils/helper/modelHelper/manufactureHelper");
const paperRequirements_1 = require("../../models/planning/requirement/paperRequirements");
const crud_helper_repository_1 = require("../../repository/helper/crud.helper.repository");
const orderApproved_1 = require("../../models/order/orderApproved");
const devEnvironment = process.env.NODE_ENV !== "production";
const { paper } = cacheKey_1.CacheKey.planning;
const filterStatus = ["planning", "lackQty", "producing", "requested"];
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
                        ...JSON.parse(cachedData),
                        message: `get all cache planning:machine:${machine}`,
                    };
                }
            }
            const data = await exports.planningPaperService.getPlanningPaperSorted(machine);
            const totals = await planningPaperRepository_1.planningPaperRepository.planningPaperTotals({
                chooseMachine: machine,
                status: { [sequelize_1.Op.in]: filterStatus },
            });
            const responseData = {
                message: `get planning by machine: ${machine}`,
                totalPrice: totals.totalPrice,
                data,
            };
            await redis_connect_1.default.set(cacheKey, JSON.stringify(responseData), "EX", 1800);
            return responseData;
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
                whereCondition: { chooseMachine: machine, status: { [sequelize_1.Op.in]: filterStatus } },
            });
            const allPlannings = exports.planningPaperService.applyPlanningSortAndOverflow(data);
            return allPlannings;
        }
        catch (error) {
            console.error("Error fetching planning by machine:", error);
            throw appError_1.AppError.ServerError();
        }
    },
    //helper function: sắp xếp planning paper theo sortPlanning + ghepKho, sau đó gộp overflow vào sau đơn gốc
    applyPlanningSortAndOverflow: (data) => {
        // Phân loại
        const withSort = data.filter((item) => item.sortPlanning !== null);
        const noSort = data.filter((item) => item.sortPlanning === null);
        // Sắp xếp đơn có sortPlanning (sắp tăng)
        withSort.sort((a, b) => (a.sortPlanning ?? 0) - (b.sortPlanning ?? 0));
        // Sắp xếp đơn chưa có sortPlanning (sắp giảm theo ghepKho)
        noSort.sort((a, b) => (b.ghepKho ?? 0) - (a.ghepKho ?? 0));
        const sortedPlannings = [...withSort, ...noSort];
        // Gộp overflow vào liền sau đơn gốc
        const allPlannings = [];
        const overflowRemoveFields = ["runningPlan", "quantityManufacture"];
        sortedPlannings.forEach((planning) => {
            const planningJson = typeof planning.toJSON === "function" ? planning.toJSON() : planning;
            const original = {
                ...planningJson,
                timeRunning: planning.timeRunning,
                dayStart: planning.dayStart,
            };
            allPlannings.push(original);
            if (planning.timeOverFlow) {
                const overflow = { ...planningJson };
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
    },
    getPlanningByField: async ({ machine, field, keyword, }) => {
        try {
            const validFields = ["orderId", "customerName", "ghepKho"];
            if (!validFields.includes(field)) {
                throw appError_1.AppError.BadRequest(`Field '${field}' is not supported for search`, "INVALID_FIELD");
            }
            const index = meilisearch_connect_1.meiliClient.index("planningPapers");
            const searchResult = await index.search(keyword, {
                attributesToSearchOn: [field],
                attributesToRetrieve: ["planningId"],
                filter: `chooseMachine = "${machine}" AND status IN ${JSON.stringify(filterStatus)}`,
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
                const plannings = await planningPaperRepository_1.planningPaperRepository.getPapersById({ planningIds, transaction });
                if (plannings.length === 0) {
                    throw appError_1.AppError.NotFound("planning not found", "PLANNING_NOT_FOUND");
                }
                for (const planning of plannings) {
                    planning.chooseMachine = newMachine;
                    planning.sortPlanning = null;
                    await planning.save({ transaction });
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
    completePlanningPaper: async (planningId, forceComplete = false) => {
        return await (0, manufactureHelper_1.updateStatusPaper)({
            planningId,
            targetStatus: "complete",
            extraValidator: (papers) => {
                for (const p of papers) {
                    if (forceComplete) {
                        const qtyManufacture = p.Order.quantityManufacture ?? 0;
                        if (qtyManufacture !== 0) {
                            throw appError_1.AppError.BadRequest(`Đơn ${p.orderId} còn số lượng chưa sản xuất`, "PLANNING_NOT_PRODUCED");
                        }
                    }
                    else {
                        if (p.status !== "requested") {
                            throw appError_1.AppError.BadRequest(`Đơn ${p.orderId} chưa được yêu cầu hoàn thành`, "PLANNING_NOT_REQUESTED");
                        }
                        if ((p.qtyProduced ?? 0) < p.runningPlan) {
                            throw appError_1.AppError.BadRequest(`Đơn ${p.orderId} sản xuất thiếu số lượng`, "LACK_QUANTITY");
                        }
                    }
                }
            },
        });
    },
    pauseOrAcceptLackQtyPLanning: async ({ planningIds, newStatus, username, }) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const plannings = await planningPaperRepository_1.planningPaperRepository.getPapersById({ planningIds, transaction });
                if (plannings.length === 0) {
                    throw appError_1.AppError.NotFound("planning not found", "PLANNING_NOT_FOUND");
                }
                if (newStatus !== "complete") {
                    for (const planning of plannings) {
                        if (planning.orderId) {
                            const order = await crud_helper_repository_1.CrudHelper.findOne({
                                model: order_1.Order,
                                where: { orderId: planning.orderId },
                                options: { transaction },
                            });
                            if (order) {
                                //case: cancel planning -> status:reject order
                                //if qtyProduced = 0 -> status:reject order -> delete planning paper&box -> minus debt of customer
                                if (newStatus === "reject") {
                                    if ((planning.qtyProduced ?? 0) > 0) {
                                        throw appError_1.AppError.Conflict(`Không thể dừng đơn hàng đã có số lượng`, "CANNOT_REJECT_PRODUCED_PLANNING");
                                    }
                                    // Trả order về reject
                                    await Promise.all([
                                        crud_helper_repository_1.CrudHelper.updateData({
                                            model: order,
                                            data: { status: newStatus },
                                            options: { transaction },
                                        }),
                                        crud_helper_repository_1.CrudHelper.createData({
                                            model: orderApproved_1.OrderApproved,
                                            data: {
                                                approvedBy: username,
                                                action: "RETURNED",
                                                orderId: order.orderId,
                                            },
                                            transaction,
                                        }),
                                    ]);
                                    // Trừ công nợ khách hàng
                                    // const customer = await planningRepository.findOne(
                                    //   Customer,
                                    //   { customerId: order.customerId },
                                    //   { attributes: ["customerId", "debtCurrent"] }
                                    // );
                                    // if (customer) {
                                    //   let debtAfter = (customer.debtCurrent || 0) - order.totalPrice;
                                    //   if (debtAfter < 0) debtAfter = 0; //tránh âm tiền
                                    //   await planningRepository.updateData(customer, { debtCurrent: debtAfter });
                                    // }
                                    // Xoá dữ liệu phụ thuộc
                                    const dependents = await planningPaperRepository_1.planningPaperRepository.getBoxByPlanningId(planning.planningId, transaction);
                                    for (const box of dependents) {
                                        await crud_helper_repository_1.CrudHelper.deleteData({
                                            model: planningBoxMachineTime_1.PlanningBoxTime,
                                            where: { planningBoxId: box.planningBoxId },
                                            transaction,
                                        });
                                        await box.destroy({ transaction });
                                    }
                                    //xóa planning paper
                                    const deletedId = planning.planningId;
                                    await planning.destroy({ transaction });
                                    //--------------------MEILISEARCH-----------------------
                                    await meiliService_1.meiliService.deleteMeiliData({
                                        indexKey: labelFields_1.MEILI_INDEX.PLANNING_PAPERS,
                                        idOrIds: deletedId,
                                        transaction,
                                    });
                                    await meiliService_1.meiliService.syncOrUpdateMeiliData({
                                        indexKey: labelFields_1.MEILI_INDEX.ORDERS,
                                        data: { orderSortValue: order.orderSortValue, status: newStatus },
                                        isUpdate: true,
                                        transaction,
                                    });
                                }
                                //case pause planning -> status:accept or stop order
                                //if qtyProduced = 0 -> delete planning paper&box -> status:accept order
                                //if qtyProduced > 0 -> status:stop order -> status:stop planning paper&box
                                else if (newStatus === "stop") {
                                    const hasOutbound = await planningPaperRepository_1.planningPaperRepository.countObDetailByPlanningId(planning.planningId, transaction);
                                    if (hasOutbound > 0) {
                                        throw appError_1.AppError.Conflict(`Không thể hủy đơn ${planning.orderId} vì đã được xuất kho`, "PLANNING_HAS_OUTBOUND_DETAILS");
                                    }
                                    const dependents = await planningPaperRepository_1.planningPaperRepository.getBoxByPlanningId(planning.planningId, transaction);
                                    if ((planning.qtyProduced ?? 0) > 0) {
                                        await crud_helper_repository_1.CrudHelper.updateData({
                                            model: order,
                                            data: { status: newStatus },
                                            options: { transaction },
                                        });
                                        await crud_helper_repository_1.CrudHelper.updateData({
                                            model: planning,
                                            data: { status: newStatus },
                                            options: { transaction },
                                        });
                                        for (const box of dependents) {
                                            await crud_helper_repository_1.CrudHelper.updateData({
                                                model: planningBoxMachineTime_1.PlanningBoxTime,
                                                data: { status: newStatus },
                                                options: { where: { planningBoxId: box.planningBoxId }, transaction },
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
                                        await crud_helper_repository_1.CrudHelper.updateData({
                                            model: order,
                                            data: { status: "accept" },
                                            options: { transaction },
                                        });
                                        for (const box of dependents) {
                                            await crud_helper_repository_1.CrudHelper.deleteData({
                                                model: planningBoxMachineTime_1.PlanningBoxTime,
                                                where: { planningBoxId: box.planningBoxId },
                                                transaction,
                                            });
                                            await box.destroy({ transaction });
                                        }
                                        const deletedId = planning.planningId;
                                        await planning.destroy({ transaction });
                                        await cacheManager_1.CacheManager.clear("orderAccept");
                                        //--------------------MEILISEARCH-----------------------
                                        await meiliService_1.meiliService.deleteMeiliData({
                                            indexKey: labelFields_1.MEILI_INDEX.PLANNING_PAPERS,
                                            idOrIds: deletedId,
                                            transaction,
                                        });
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
                            throw appError_1.AppError.BadRequest("Không thể hoàn thành đơn hàng chưa được sắp xếp", "CANNOT_COMPLETE_WITHOUT_SORT");
                        }
                        if (planning.status !== "requested") {
                            throw appError_1.AppError.BadRequest(`Đơn ${planning.orderId} chưa được yêu cầu hoàn thành`, "PLANNING_NOT_REQUESTED");
                        }
                        planning.status = newStatus;
                        await planning.save({ transaction });
                        if (planning.hasOverFlow) {
                            await crud_helper_repository_1.CrudHelper.updateData({
                                model: timeOverflowPlanning_1.timeOverflowPlanning,
                                data: { status: newStatus },
                                options: { where: { planningId: planning.planningId }, transaction },
                            });
                        }
                        const [planningBox, requirement] = await Promise.all([
                            crud_helper_repository_1.CrudHelper.findOne({
                                model: planningBox_1.PlanningBox,
                                where: { planningId: planning.planningId },
                                options: { transaction },
                            }),
                            crud_helper_repository_1.CrudHelper.findOne({
                                model: paperRequirements_1.PaperRequirements,
                                where: { planningId: planning.planningId },
                                options: { transaction },
                            }),
                        ]);
                        //update qty produced for planning box
                        if (planningBox) {
                            await crud_helper_repository_1.CrudHelper.updateData({
                                model: planningBoxMachineTime_1.PlanningBoxTime,
                                data: { runningPlan: planning.qtyProduced ?? 0 },
                                options: { where: { planningBoxId: planningBox.planningBoxId }, transaction },
                            });
                        }
                        //complete paper requirement
                        if (requirement && requirement.status !== "COMPLETED") {
                            await crud_helper_repository_1.CrudHelper.updateData({
                                model: requirement,
                                data: { status: "COMPLETED" },
                                options: { transaction },
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
    updateIndex_TimeRunning: async ({ updateIndex, machine, dayStart, timeStart, totalTimeWorking, }) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                // Cập nhật sortPlanning
                await (0, timeRunningPaper_1.updateSortPlanning)(updateIndex, transaction);
                // Lấy lại danh sách đã update
                const plannings = await planningPaperRepository_1.planningPaperRepository.getPapersByUpdateIndex(updateIndex, transaction);
                // Lấy thông tin máy
                const machineInfo = await machinePaper_1.MachinePaper.findAll({
                    where: { machineName: machine },
                    transaction,
                });
                if (!machineInfo)
                    throw appError_1.AppError.NotFound("Machine not found", "MACHINE_NOT_FOUND");
                // console.log(`machineInfo: ${JSON.stringify(machineInfo)}`);
                const machineMap = {
                    m2: machineInfo.find((m) => m.type === "M2"),
                    kg: machineInfo.find((m) => m.type === "Kg"),
                };
                // console.log(`machine map: ${JSON.stringify(machineMap)}`);
                // console.log(`==========================================`);
                // Tính toán thời gian chạy
                const updatedPlannings = await (0, timeRunningPaper_1.calculateTimeRunning)({
                    plannings,
                    machineMap,
                    machine,
                    dayStart,
                    timeStart,
                    totalTimeWorking,
                    transaction,
                });
                return {
                    message: "Cập nhật sortPlanning + tính thời gian thành công",
                    data: updatedPlannings,
                };
            });
        }
        catch (error) {
            console.log("Error in updateIndex_TimeRunning:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    addNoteToPlanning: async (planningId, note) => {
        try {
            const paper = await planningPaper_1.PlanningPaper.findByPk(planningId);
            if (!paper) {
                throw appError_1.AppError.NotFound("Planning paper not found", "PLANNING_PAPER_NOT_FOUND");
            }
            await paper.update({ note });
            return { message: "Note updated successfully" };
        }
        catch (error) {
            console.log("Error in addNoteToPlanning:", error);
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
    //export excel
    exportExcelPlanningOrder: async (res, machine, isAll) => {
        try {
            let finalData;
            if (isAll) {
                finalData = await exports.planningPaperService.getPlanningPaperSorted(machine);
            }
            else {
                const data = await planningPaperRepository_1.planningPaperRepository.getPaperToExportFile(machine);
                finalData = exports.planningPaperService.applyPlanningSortAndOverflow(data);
            }
            const safeMachineName = machine.replace(/\s+/g, "_");
            const showColumns = isAll
                ? planningPaperRowAndColumn_1.planningPaperColumns
                : planningPaperRowAndColumn_1.planningPaperColumns.filter((col) => !col.isFull);
            await (0, excelExporter_1.exportExcelResponse)(res, {
                data: finalData,
                sheetName: "Kế hoạch sản xuất",
                fileName: `KHSX_${isAll ? "all" : "partial"}_${(0, normalizeVN_1.normalizeVN)(safeMachineName)}`,
                columns: showColumns,
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