"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.inboundService = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const sequelize_1 = require("sequelize");
const meiliService_1 = require("../system/meiliService");
const appError_1 = require("../../utils/appError");
const order_1 = require("../../models/order/order");
const labelFields_1 = require("../../assets/labelFields");
const cacheKey_1 = require("../../utils/helper/cache/cacheKey");
const planningBox_1 = require("../../models/planning/planningBox");
const dayjs_config_1 = require("../../assets/configs/dayjs/dayjs.config");
const planningPaper_1 = require("../../models/planning/planningPaper");
const redis_connect_1 = __importDefault(require("../../assets/configs/connect/redis.connect"));
const cacheManager_1 = require("../../utils/helper/cache/cacheManager");
const inboundHistory_1 = require("../../models/warehouse/inboundHistory");
const inventory_1 = require("../../models/warehouse/inventory/inventory");
const manufactureRepository_1 = require("../../repository/manufactureRepository");
const warehouseRepository_1 = require("../../repository/warehouseRepository");
const inventoryRepository_1 = require("../../repository/inventoryRepository");
const syntheticRepository_1 = require("../../repository/synthetic/syntheticRepository");
const excelExporter_1 = require("../../utils/helper/excelExporter");
const planningBoxMachineTime_1 = require("../../models/planning/planningBoxMachineTime");
const meilisearch_connect_1 = require("../../assets/configs/connect/meilisearch.connect");
const planning_timeRunning_helper_1 = require("../../utils/helper/modelHelper/planning.timeRunning.helper");
const meiliTransformer_1 = require("../../assets/configs/meilisearch/meiliTransformer");
const inboundRowAndColumn_1 = require("../../utils/mapping/warehouse/inboundRowAndColumn");
const inventoryService_1 = require("../inventory/inventoryService");
const inventoryLogService_1 = require("../inventory/inventoryLogService");
const crud_helper_repository_1 = require("../../repository/helper/crud.helper.repository");
const devEnvironment = process.env.NODE_ENV !== "production";
const { inbound } = cacheKey_1.CacheKey.warehouse;
const { paper, box } = cacheKey_1.CacheKey.waitingCheck;
exports.inboundService = {
    //====================================WAITING CHECK AND INBOUND QTY========================================
    getPaperWaitingChecked: async () => {
        const cacheKey = paper.all;
        try {
            const { isChanged } = await cacheManager_1.CacheManager.check([{ model: planningPaper_1.PlanningPaper }, { model: inboundHistory_1.InboundHistory }], "checkPaper");
            if (isChanged) {
                await cacheManager_1.CacheManager.clear("checkPaper");
            }
            else {
                const cachedData = await redis_connect_1.default.get(cacheKey);
                if (cachedData) {
                    if (devEnvironment)
                        console.log("✅ Data waiting check paper from Redis");
                    return {
                        ...JSON.parse(cachedData),
                        message: `get planning paper waiting check from cache`,
                    };
                }
            }
            const planning = await warehouseRepository_1.warehouseRepository.getPaperWaitingChecked();
            const allPlannings = [];
            const overflowRemoveFields = ["runningPlan", "quantityManufacture"];
            planning.forEach((planning) => {
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
            const responseData = {
                message: "get planning paper waiting check successfully",
                data: allPlannings,
            };
            await redis_connect_1.default.set(cacheKey, JSON.stringify(responseData), "EX", 3600);
            return responseData;
        }
        catch (error) {
            console.error("Failed to get paper waiting checked:", error);
            throw appError_1.AppError.ServerError();
        }
    },
    getBoxWaitingChecked: async () => {
        const cacheKey = box.all;
        try {
            const { isChanged } = await cacheManager_1.CacheManager.check(planningBox_1.PlanningBox, "checkBox");
            if (isChanged) {
                await cacheManager_1.CacheManager.clear("checkBox");
            }
            else {
                const cachedData = await redis_connect_1.default.get(cacheKey);
                if (cachedData) {
                    if (devEnvironment)
                        console.log("✅ Data waiting check box from Redis");
                    return {
                        ...JSON.parse(cachedData),
                        message: `get planning box waiting check from cache`,
                    };
                }
            }
            const planning = await warehouseRepository_1.warehouseRepository.getBoxWaitingChecked();
            const responseData = { message: `get planning box waiting check`, data: planning };
            await redis_connect_1.default.set(cacheKey, JSON.stringify(responseData), "EX", 3600);
            return responseData;
        }
        catch (error) {
            console.error("Failed to get box waiting checked", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    getBoxCheckedDetail: async (planningBoxId) => {
        try {
            //get data detail
            const detail = await warehouseRepository_1.warehouseRepository.getBoxCheckedDetail(planningBoxId);
            if (!detail) {
                throw appError_1.AppError.NotFound("detail not found", "DETAIL_NOT_FOUND");
            }
            const stages = await (0, planning_timeRunning_helper_1.buildStagesDetails)({
                detail,
                getBoxTimes: (d) => d.boxTimes,
                getPlanningBoxId: (d) => d.planningBoxId,
                getAllOverflow: (id) => syntheticRepository_1.syntheticRepository.getAllTimeOverflow(id),
            });
            return { message: "get db planning detail succesfully", data: stages };
        }
        catch (error) {
            console.error("Failed to get box waiting checked", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    //inbound paper
    inboundQtyPaper: async ({ planningId, inboundQty, qcSessionId, transaction, }) => {
        try {
            const planning = await manufactureRepository_1.manufactureRepo.getPapersById(planningId, transaction);
            if (!planning) {
                throw appError_1.AppError.NotFound("Không tìm thấy kế hoạch", "PLANNING_NOT_FOUND");
            }
            const totalInboundQty = (await inboundHistory_1.InboundHistory.sum("qtyInbound", {
                where: { planningId: planning.planningId },
                transaction,
            })) ?? 0;
            const qtyProduced = planning.qtyProduced ?? 0;
            if (totalInboundQty + inboundQty > qtyProduced) {
                throw appError_1.AppError.BadRequest("Số lượng nhập kho vượt quá số lượng sản xuất", "INBOUND_EXCEED_PRODUCED");
            }
            const isFirstInbound = totalInboundQty === 0;
            //createData inventory
            const inventory = await inventoryService_1.inventoryService.createNewInventory(planning.orderId, transaction);
            //createData inbound record
            const pricePaper = planning.Order.pricePaper ?? 0;
            const inboundRecord = await crud_helper_repository_1.CrudHelper.createData({
                model: inboundHistory_1.InboundHistory,
                data: {
                    dateInbound: new Date(),
                    qtyPaper: qtyProduced,
                    qtyInbound: inboundQty,
                    totalPrice: inboundQty * pricePaper,
                    orderId: planning.orderId,
                    planningId,
                    qcSessionId,
                },
                transaction,
            });
            //update inventory
            const finalQty = inventory.qtyInventory + inboundQty;
            const finalValue = finalQty < 0 ? 0 : finalQty * pricePaper;
            await inventory_1.Inventory.update({
                totalQtyInbound: inventory.totalQtyInbound + inboundQty,
                qtyInventory: finalQty,
                valueInventory: finalValue,
            }, {
                where: { orderId: planning.orderId },
                transaction,
            });
            if (isFirstInbound) {
                await planning.update({ statusRequest: "inbounded" }, { transaction });
                await inventory_1.Inventory.update({ dateInbound: new Date() }, { where: { orderId: planning.orderId }, transaction });
            }
            //inventory log
            await inventoryLogService_1.inventoryLogService.followInventoryChange({
                items: [{ inventoryId: inventory.inventoryId, changeQty: inboundQty }],
                type: "INBOUND",
                transaction,
            });
            //xóa cache
            await cacheManager_1.CacheManager.clear("checkPaper");
            //--------------------MEILISEARCH-----------------------
            await exports.inboundService.syncInboundAndInventoryToMeili({
                inboundId: inboundRecord.inboundId,
                orderId: planning.orderId,
                transaction,
            });
            return {
                message: "Confirm producing paper successfully",
                data: inboundRecord,
            };
        }
        catch (error) {
            console.error("Error inbound paper:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    //inbound box
    inboundQtyBox: async ({ planningBoxId, inboundQty, qcSessionId, transaction, }) => {
        try {
            const planning = await crud_helper_repository_1.CrudHelper.findOne({
                model: planningBox_1.PlanningBox,
                where: { planningBoxId },
                options: {
                    include: [
                        { model: planningBoxMachineTime_1.PlanningBoxTime, as: "boxTimes", where: { planningBoxId, isRequest: true } },
                        { model: order_1.Order, attributes: ["quantityCustomer", "pricePaper"] },
                    ],
                    transaction,
                    lock: transaction?.LOCK.UPDATE,
                },
            });
            if (!planning) {
                throw appError_1.AppError.NotFound("Planning not found", "PLANNING_NOT_FOUND");
            }
            const totalInboundQty = (await inboundHistory_1.InboundHistory.sum("qtyInbound", {
                where: { planningBoxId: planning.planningBoxId },
            })) ?? 0;
            const qtyProduced = planning.boxTimes?.[0].qtyProduced ?? 0;
            if (totalInboundQty + inboundQty > qtyProduced) {
                throw appError_1.AppError.BadRequest("Số lượng nhập kho vượt quá số lượng sản xuất", "INBOUND_EXCEED_PRODUCED");
            }
            const isFirstInbound = totalInboundQty === 0;
            //createData inventory
            const inventory = await inventoryService_1.inventoryService.createNewInventory(planning.orderId, transaction);
            //createData inbound record
            const pricePaper = planning.Order.pricePaper ?? 0;
            const inboundRecord = await crud_helper_repository_1.CrudHelper.createData({
                model: inboundHistory_1.InboundHistory,
                data: {
                    dateInbound: new Date(),
                    qtyPaper: planning.qtyPaper,
                    qtyInbound: inboundQty,
                    totalPrice: inboundQty * pricePaper,
                    orderId: planning.orderId,
                    planningBoxId,
                    qcSessionId,
                },
                transaction,
            });
            //update inventory
            const finalQty = inventory.qtyInventory + inboundQty;
            const finalValue = finalQty < 0 ? 0 : finalQty * pricePaper;
            await inventory_1.Inventory.update({
                totalQtyInbound: inventory.totalQtyInbound + inboundQty,
                qtyInventory: finalQty,
                valueInventory: finalValue,
            }, {
                where: { orderId: planning.orderId },
                transaction,
            });
            if (isFirstInbound) {
                await planning.update({ statusRequest: "inbounded" }, { transaction });
                await inventory_1.Inventory.update({ dateInbound: new Date() }, { where: { orderId: planning.orderId }, transaction });
            }
            await inventoryLogService_1.inventoryLogService.followInventoryChange({
                items: [{ inventoryId: inventory.inventoryId, changeQty: inboundQty }],
                type: "INBOUND",
                transaction,
            });
            //xóa cache
            await cacheManager_1.CacheManager.clear("checkBox");
            //--------------------MEILISEARCH-----------------------
            await exports.inboundService.syncInboundAndInventoryToMeili({
                inboundId: inboundRecord.inboundId,
                orderId: planning.orderId,
                transaction,
            });
            return {
                message: "Confirm producing paper successfully",
                data: inboundRecord,
            };
        }
        catch (error) {
            console.error("Error inbound box:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    syncInboundAndInventoryToMeili: async ({ inboundId, orderId, transaction, }) => {
        try {
            const [inbound, inventory] = await Promise.all([
                warehouseRepository_1.warehouseRepository.syncInboundForMeili(inboundId, transaction),
                inventoryRepository_1.inventoryRepository.syncInventoryForMeili(orderId, transaction),
            ]);
            const flattenInbound = meiliTransformer_1.meiliTransformer.inbound(inbound);
            const flattenInventory = meiliTransformer_1.meiliTransformer.inventory(inventory);
            await meiliService_1.meiliService.syncOrUpdateMeiliData({
                indexKey: labelFields_1.MEILI_INDEX.INBOUND,
                data: flattenInbound,
                transaction,
            });
            await meiliService_1.meiliService.syncOrUpdateMeiliData({
                indexKey: labelFields_1.MEILI_INDEX.INVENTORIES,
                data: flattenInventory,
                transaction,
            });
        }
        catch (error) {
            console.error("Error sync inbound & inventory box:", error);
            throw appError_1.AppError.ServerError();
        }
    },
    //====================================INBOUND HISTORY========================================
    getAllInboundHistory: async (page, pageSize) => {
        const cacheKey = inbound.page(page);
        try {
            const { isChanged } = await cacheManager_1.CacheManager.check(inboundHistory_1.InboundHistory, "inbound");
            if (isChanged) {
                await cacheManager_1.CacheManager.clear("inbound");
            }
            else {
                const cachedData = await redis_connect_1.default.get(cacheKey);
                if (cachedData) {
                    if (devEnvironment)
                        console.log("✅ Data inbound from Redis");
                    const parsed = JSON.parse(cachedData);
                    return { ...parsed, message: `Get all inbound from cache` };
                }
            }
            const options = warehouseRepository_1.warehouseRepository.buildInboundOptions({ page, pageSize });
            const { rows, count } = await inboundHistory_1.InboundHistory.findAndCountAll(options);
            const totalPages = Math.ceil(count / pageSize);
            const responseData = {
                message: "Get all inbound history successfully",
                data: rows,
                totalInbounds: count,
                totalPages,
                currentPage: page,
            };
            await redis_connect_1.default.set(cacheKey, JSON.stringify(responseData), "EX", 3600);
            return responseData;
        }
        catch (error) {
            console.error("get all inbound history failed:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    getInboundByField: async ({ field, keyword, page, pageSize, startDate, endDate, }) => {
        try {
            const validFields = ["orderId", "customerName", "dateInbound", "checkedBy"];
            if (!validFields.includes(field)) {
                throw appError_1.AppError.BadRequest(`Field '${field}' is not supported for search`, "INVALID_FIELD");
            }
            const index = meilisearch_connect_1.meiliClient.index("inboundHistories");
            let searchKeyword = keyword;
            let filter = [];
            if (field === "dateInbound") {
                searchKeyword = "";
                if (startDate && endDate) {
                    const startTimestamp = dayjs_config_1.dayjsUtc.utc(startDate).startOf("day").unix();
                    filter.push(`dateInbound >= ${startTimestamp}`);
                    const endTimestamp = dayjs_config_1.dayjsUtc.utc(endDate).endOf("day").unix();
                    filter.push(`dateInbound <= ${endTimestamp}`);
                }
                // console.log(`start: ${startDate} - end: ${endDate}`);
                // console.log(`filter: ${filter.join(" AND ")}`);
            }
            const searchOptions = {
                filter: filter.join(" AND "),
                attributesToSearchOn: searchKeyword ? [field] : [],
                attributesToRetrieve: ["inboundId"],
                sort: ["dateInbound:desc"],
                page: Number(page) || 1,
                hitsPerPage: Number(pageSize) || 25, //pageSize
            };
            const searchResult = await index.search(searchKeyword, searchOptions);
            const inboundIds = searchResult.hits.map((hit) => hit.inboundId);
            if (inboundIds.length === 0) {
                return {
                    message: "No inbound histories found",
                    data: [],
                    totalInbounds: 0,
                    totalPages: 0,
                    currentPage: page,
                };
            }
            //query db
            const options = warehouseRepository_1.warehouseRepository.buildInboundOptions({
                whereCondition: { inboundId: { [sequelize_1.Op.in]: inboundIds } },
            });
            const { rows } = await inboundHistory_1.InboundHistory.findAndCountAll(options);
            // Sắp xếp lại thứ tự của SQL theo đúng thứ tự của Meilisearch
            const finalData = inboundIds
                .map((id) => rows.find((inbound) => inbound.inboundId === id))
                .filter(Boolean);
            return {
                message: "Get inbound histories from Meilisearch & DB successfully",
                data: finalData,
                totalInbounds: searchResult.totalHits,
                totalPages: searchResult.totalPages,
                currentPage: searchResult.page,
            };
        }
        catch (error) {
            console.error(`get inbound history by ${field} failed:`, error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    exportExcelInboundHistory: async (res, { fromDate, toDate }, userName) => {
        try {
            let whereCondition = {};
            if (fromDate && toDate) {
                const startTimestamp = (0, dayjs_config_1.dayjsUtc)(fromDate).startOf("day").toDate();
                const endTimestamp = (0, dayjs_config_1.dayjsUtc)(toDate).endOf("day").toDate();
                // console.log(`start: ${fromDate} - end: ${toDate}`);
                // console.log(`startTimestamp: ${startTimestamp} - endTimestamp: ${endTimestamp}`);
                whereCondition.dateInbound = { [sequelize_1.Op.between]: [startTimestamp, endTimestamp] };
            }
            const baseQuery = warehouseRepository_1.warehouseRepository.buildInboundOptions({
                whereCondition,
                isExport: true,
            });
            await (0, excelExporter_1.exportExcelStreamResponse)(res, {
                baseQuery: baseQuery,
                model: inboundHistory_1.InboundHistory,
                sheetName: "Lịch sử nhập kho",
                fileName: "inbound_history",
                columns: inboundRowAndColumn_1.inboundColumns,
                rows: inboundRowAndColumn_1.mappingInboundRow,
                userName: userName,
            });
        }
        catch (error) {
            console.error("❌ Export Excel error:", error);
            throw appError_1.AppError.ServerError();
        }
    },
};
//# sourceMappingURL=inboundService.js.map