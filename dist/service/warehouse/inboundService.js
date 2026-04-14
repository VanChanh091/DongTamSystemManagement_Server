"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.inboundService = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const redis_connect_1 = __importDefault(require("../../assets/configs/connect/redis.connect"));
const appError_1 = require("../../utils/appError");
const inboundHistory_1 = require("../../models/warehouse/inboundHistory");
const warehouseRepository_1 = require("../../repository/warehouseRepository");
const manufactureRepository_1 = require("../../repository/manufactureRepository");
const planningHelper_1 = require("../../repository/planning/planningHelper");
const planningBox_1 = require("../../models/planning/planningBox");
const planningBoxMachineTime_1 = require("../../models/planning/planningBoxMachineTime");
const cacheManager_1 = require("../../utils/helper/cache/cacheManager");
const dashboardRepository_1 = require("../../repository/dashboardRepository");
const planningHelper_2 = require("../../utils/helper/modelHelper/planningHelper");
const planningPaper_1 = require("../../models/planning/planningPaper");
const inventoryService_1 = require("./inventoryService");
const inventory_1 = require("../../models/warehouse/inventory/inventory");
const order_1 = require("../../models/order/order");
const cacheKey_1 = require("../../utils/helper/cache/cacheKey");
const meiliService_1 = require("../meiliService");
const meilisearch_connect_1 = require("../../assets/configs/connect/meilisearch.connect");
const sequelize_1 = require("sequelize");
const meiliTransformer_1 = require("../../assets/configs/meilisearch/meiliTransformer");
const labelFields_1 = require("../../assets/labelFields");
const inventoryRepository_1 = require("../../repository/inventoryRepository");
const devEnvironment = process.env.NODE_ENV !== "production";
const { inbound } = cacheKey_1.CacheKey.warehouse;
const { paper, box } = cacheKey_1.CacheKey.waitingCheck;
exports.inboundService = {
    //====================================WAITING CHECK AND INBOUND QTY========================================
    getPaperWaitingChecked: async () => {
        const cacheKey = paper.all;
        try {
            const { isChanged } = await cacheManager_1.CacheManager.check(planningPaper_1.PlanningPaper, "checkPaper");
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
            const stages = await (0, planningHelper_2.buildStagesDetails)({
                detail,
                getBoxTimes: (d) => d.boxTimes,
                getPlanningBoxId: (d) => d.planningBoxId,
                getAllOverflow: (id) => dashboardRepository_1.dashboardRepository.getAllTimeOverflow(id),
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
            //create inventory
            await inventoryService_1.inventoryService.createNewInventory(planning.orderId, transaction);
            const inboundRecord = await planningHelper_1.planningHelper.createData({
                model: inboundHistory_1.InboundHistory,
                data: {
                    dateInbound: new Date(),
                    qtyPaper: qtyProduced,
                    qtyInbound: inboundQty,
                    orderId: planning.orderId,
                    planningId,
                    qcSessionId,
                },
                transaction,
            });
            //update inventory
            await inventory_1.Inventory.increment({
                totalQtyInbound: inboundQty,
                qtyInventory: inboundQty,
                valueInventory: inboundQty * planning.Order.pricePaper,
            }, {
                where: { orderId: planning.orderId },
                transaction,
            });
            if (isFirstInbound) {
                await planning.update({ statusRequest: "inbounded" }, { transaction });
            }
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
            const planning = await planningHelper_1.planningHelper.getModelById({
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
            //create inventory
            await inventoryService_1.inventoryService.createNewInventory(planning.orderId, transaction);
            const inboundRecord = await planningHelper_1.planningHelper.createData({
                model: inboundHistory_1.InboundHistory,
                data: {
                    dateInbound: new Date(),
                    qtyPaper: planning.qtyPaper,
                    qtyInbound: inboundQty,
                    orderId: planning.orderId,
                    planningBoxId,
                    qcSessionId,
                },
                transaction,
            });
            //update inventory
            await inventory_1.Inventory.increment({
                totalQtyInbound: inboundQty,
                qtyInventory: inboundQty,
                valueInventory: inboundQty * planning.Order.pricePaper,
            }, {
                where: { orderId: planning.orderId },
                transaction,
            });
            if (isFirstInbound) {
                await planning.update({ statusRequest: "inbounded" }, { transaction });
                const paper = await planningPaper_1.PlanningPaper.findOne({
                    where: { planningId: planning.planningId },
                    attributes: ["planningId", "statusRequest"],
                });
                if (!paper) {
                    throw appError_1.AppError.BadRequest("planning paper not found", "PLANNING_PAPER_NOT_FOUND");
                }
                await paper.update({ statusRequest: "inbounded" }, { transaction });
            }
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
                warehouseRepository_1.warehouseRepository.syncInbound(inboundId, transaction),
                inventoryRepository_1.inventoryRepository.syncInventory(orderId, transaction),
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
            const { rows, count } = await warehouseRepository_1.warehouseRepository.findInboundByPage({ page, pageSize });
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
    getInboundByField: async ({ field, keyword, page, pageSize }) => {
        try {
            const validFields = ["orderId", "customerName", "dateInbound", "checkedBy"];
            if (!validFields.includes(field)) {
                throw appError_1.AppError.BadRequest(`Field '${field}' is not supported for search`, "INVALID_FIELD");
            }
            const index = meilisearch_connect_1.meiliClient.index("inboundHistories");
            const searchResult = await index.search(keyword, {
                attributesToSearchOn: [field],
                attributesToRetrieve: ["inboundId"],
                page: Number(page) || 1,
                hitsPerPage: Number(pageSize) || 25, //pageSize
            });
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
            const { rows } = await warehouseRepository_1.warehouseRepository.findInboundByPage({
                whereCondition: { inboundId: { [sequelize_1.Op.in]: inboundIds } },
            });
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
};
//# sourceMappingURL=inboundService.js.map