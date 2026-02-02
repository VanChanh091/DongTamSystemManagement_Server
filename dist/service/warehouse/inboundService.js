"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.inboundService = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const redisCache_1 = __importDefault(require("../../assest/configs/redisCache"));
const appError_1 = require("../../utils/appError");
const inboundHistory_1 = require("../../models/warehouse/inboundHistory");
const warehouseRepository_1 = require("../../repository/warehouseRepository");
const manufactureRepository_1 = require("../../repository/manufactureRepository");
const planningRepository_1 = require("../../repository/planningRepository");
const planningBox_1 = require("../../models/planning/planningBox");
const planningBoxMachineTime_1 = require("../../models/planning/planningBoxMachineTime");
const cacheManager_1 = require("../../utils/helper/cacheManager");
const warehouseHelper_1 = require("../../utils/helper/modelHelper/warehouseHelper");
const dashboardRepository_1 = require("../../repository/dashboardRepository");
const planningHelper_1 = require("../../utils/helper/modelHelper/planningHelper");
const inventory_1 = require("../../models/warehouse/inventory");
const inventoryService_1 = require("./inventoryService");
const order_1 = require("../../models/order/order");
const planningPaper_1 = require("../../models/planning/planningPaper");
const devEnvironment = process.env.NODE_ENV !== "production";
const { inbound } = cacheManager_1.CacheManager.keys.warehouse;
exports.inboundService = {
    //====================================WAITING CHECK AND INBOUND QTY========================================
    getPaperWaitingChecked: async () => {
        try {
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
            return { message: `get planning paper waiting check`, data: allPlannings };
        }
        catch (error) {
            console.error("Failed to get paper waiting checked:", error);
            throw appError_1.AppError.ServerError();
        }
    },
    getBoxWaitingChecked: async () => {
        try {
            const planning = await warehouseRepository_1.warehouseRepository.getBoxWaitingChecked();
            return { message: `get planning by machine waiting check`, data: planning };
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
            const stages = await (0, planningHelper_1.buildStagesDetails)({
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
            const planning = await manufactureRepository_1.manufactureRepository.getPapersById(planningId, transaction);
            if (!planning) {
                throw appError_1.AppError.NotFound("Không tìm thấy kế hoạch", "PLANNING_NOT_FOUND");
            }
            const totalInboundQty = (await inboundHistory_1.InboundHistory.sum("qtyInbound", {
                where: { planningId: planning.planningId },
            })) ?? 0;
            const qtyProduced = planning.qtyProduced ?? 0;
            if (totalInboundQty + inboundQty > qtyProduced) {
                throw appError_1.AppError.BadRequest("Số lượng nhập kho vượt quá số lượng sản xuất", "INBOUND_EXCEED_PRODUCED");
            }
            const isFirstInbound = totalInboundQty === 0;
            //create inventory
            await inventoryService_1.inventoryService.createNewInventory(planning.orderId, transaction);
            const inboundRecord = await planningRepository_1.planningRepository.createData({
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
            const planning = await planningRepository_1.planningRepository.getModelById({
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
            const inboundRecord = await planningRepository_1.planningRepository.createData({
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
    //====================================INBOUND HISTORY========================================
    getAllInboundHistory: async (page, pageSize) => {
        const cacheKey = inbound.page(page);
        try {
            const { isChanged } = await cacheManager_1.CacheManager.check(inboundHistory_1.InboundHistory, "inbound");
            if (isChanged) {
                await cacheManager_1.CacheManager.clearInbound();
            }
            else {
                const cachedData = await redisCache_1.default.get(cacheKey);
                if (cachedData) {
                    if (devEnvironment)
                        console.log("✅ Data inbound from Redis");
                    const parsed = JSON.parse(cachedData);
                    return { ...parsed, message: `Get all inbound from cache` };
                }
            }
            const totalInbounds = await warehouseRepository_1.warehouseRepository.inboundHistoryCount();
            const totalPages = Math.ceil(totalInbounds / pageSize);
            const data = await warehouseRepository_1.warehouseRepository.findInboundByPage({ page, pageSize });
            const responseData = {
                message: "Get all inbound history successfully",
                data,
                totalInbounds,
                totalPages,
                currentPage: page,
            };
            await redisCache_1.default.set(cacheKey, JSON.stringify(responseData), "EX", 3600);
            return responseData;
        }
        catch (error) {
            console.error("get all inbound history failed:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    searchInboundByField: async ({ field, keyword, page, pageSize, }) => {
        try {
            const fieldMap = {
                orderId: (inbound) => inbound.orderId,
                customerName: (inbound) => inbound.Order.Customer.customerName,
                companyName: (inbound) => inbound.Order.Customer.companyName,
                productName: (inbound) => inbound.Order.Product.productName,
            };
            const key = field;
            if (!fieldMap[key]) {
                throw appError_1.AppError.BadRequest("Invalid field parameter", "INVALID_FIELD");
            }
            const result = await (0, warehouseHelper_1.getInboundByField)({
                keyword: keyword,
                getFieldValue: fieldMap[key],
                page,
                pageSize,
                message: `get all by ${field} from filtered cache`,
            });
            return result;
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