"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deliveryService = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const sequelize_1 = require("sequelize");
const appError_1 = require("../utils/appError");
const deliveryPlan_1 = require("../models/delivery/deliveryPlan");
const deliveryItem_1 = require("../models/delivery/deliveryItem");
const planningPaper_1 = require("../models/planning/planningPaper");
const deliveryRequest_1 = require("../models/delivery/deliveryRequest");
const transactionHelper_1 = require("../utils/helper/transactionHelper");
const deliveryRepository_1 = require("../repository/deliveryRepository");
const orderHelpers_1 = require("../utils/helper/modelHelper/orderHelpers");
const excelExporter_1 = require("../utils/helper/excelExporter");
const deliveryRowAndComlumn_1 = require("../utils/mapping/deliveryRowAndComlumn");
const cacheKey_1 = require("../utils/helper/cache/cacheKey");
const cacheManager_1 = require("../utils/helper/cache/cacheManager");
const redisCache_1 = __importDefault(require("../assest/configs/redisCache"));
const devEnvironment = process.env.NODE_ENV !== "production";
const { estimate, schedule } = cacheKey_1.CacheKey.delivery;
exports.deliveryService = {
    //================================PLANNING ESTIMATE TIME==================================
    getPlanningEstimateTime: async ({ page = 1, pageSize = 20, dayStart, estimateTime, userId, }) => {
        const cacheKey = estimate.page(page);
        try {
            const { isChanged } = await cacheManager_1.CacheManager.check(planningPaper_1.PlanningPaper, "estimate");
            if (isChanged) {
                await cacheManager_1.CacheManager.clear("estimate");
            }
            else {
                const cachedData = await redisCache_1.default.get(cacheKey);
                if (cachedData) {
                    if (devEnvironment)
                        console.log("✅ get planning estimate time from cache");
                    return { ...JSON.parse(cachedData), message: "get all planning estimate from cache" };
                }
            }
            const [endHour, endMinute] = estimateTime.split(":").map(Number);
            if (isNaN(endHour) ||
                isNaN(endMinute) ||
                endHour < 0 ||
                endHour > 23 ||
                endMinute < 0 ||
                endMinute > 59) {
                throw appError_1.AppError.BadRequest("estimateTime không hợp lệ", "INVALID_ESTIMATE_TIME");
            }
            // mốc kết thúc NGÀY HÔM NAY
            const [estH, estM] = estimateTime.split(":").map(Number);
            const estimateMinutes = estH * 60 + estM;
            const paperPlannings = await deliveryRepository_1.deliveryRepository.getPlanningEstimateTime(dayStart, userId);
            //filter
            const filtered = paperPlannings.filter((paper) => {
                if (paper.hasOverFlow)
                    return false;
                if (paper.status === "complete")
                    return true;
                // KHÔNG CÓ BOX → so paper
                if (!paper.hasBox) {
                    if (!paper.timeRunning)
                        return false;
                    const [h, m, s = "0"] = paper.timeRunning.split(":");
                    const paperMinutes = Number(h) * 60 + Number(m) + Number(s) / 60;
                    // console.log(`time paper: ${paperMinutes}`);
                    // console.log(`compare paper: ${paperMinutes <= estimateMinutes}`);
                    return paperMinutes <= estimateMinutes;
                }
                // CÓ BOX → so theo BOX
                const boxTimes = paper.PlanningBox?.boxTimes ?? [];
                if (boxTimes.length === 0)
                    return false;
                const latestBoxMinutes = Math.max(...boxTimes.map((t) => {
                    const [h, m, s = "0"] = t.timeRunning.split(":");
                    return Number(h) * 60 + Number(m) + Number(s) / 60;
                }));
                // console.log(`latest time box: ${latestBoxMinutes}`);
                // console.log(`compare box: ${latestBoxMinutes <= estimateMinutes}`);
                return latestBoxMinutes <= estimateMinutes;
            });
            //PAGING DATA
            const totalPlannings = filtered.length;
            const totalPages = Math.ceil(totalPlannings / pageSize);
            const startIndex = (page - 1) * pageSize;
            const endIndex = startIndex + pageSize;
            const pageData = filtered.slice(startIndex, endIndex);
            //remove Planning box for UI
            const data = pageData.map((p) => {
                const plain = p.get({ plain: true });
                delete plain.PlanningBox;
                return plain;
            });
            const responseData = {
                message: "get all data paper from db",
                data,
                totalPlannings,
                totalPages,
                currentPage: page,
            };
            await redisCache_1.default.set(cacheKey, JSON.stringify(responseData), "EX", 3600);
            return responseData;
        }
        catch (error) {
            console.error("❌ get planning estimate time failed:", error);
            throw appError_1.AppError.ServerError();
        }
    },
    registerQtyDelivery: async ({ planningId, qtyRegistered, userId, }) => {
        try {
            if (!planningId || !qtyRegistered || qtyRegistered <= 0) {
                throw appError_1.AppError.BadRequest("missing parameters", "MISSING_PARAMETERS");
            }
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const planning = await deliveryRepository_1.deliveryRepository.getPaperDeliveryPlanned(planningId, transaction);
                if (!planning) {
                    throw appError_1.AppError.BadRequest("Planning không tồn tại", "PLANNING_NOT_FOUND");
                }
                if (planning.hasOverFlow) {
                    throw appError_1.AppError.BadRequest(`Planning ${planningId} bị overflow`, "PLANNING_OVERFLOW");
                }
                if (qtyRegistered > planning.qtyProduced) {
                    throw appError_1.AppError.BadRequest(`Số lượng đăng ký (${qtyRegistered}) vượt quá số lượng đã sản xuất (${planning.qtyProduced})`, "QTY_EXCEEDED");
                }
                const newDeliveryStatus = qtyRegistered === planning.qtyProduced ? "delivered" : "pending";
                //calculate volume
                const volume = await (0, orderHelpers_1.calculateVolume)({
                    flute: planning.Order.flute,
                    lengthCustomer: planning.Order.lengthPaperCustomer,
                    sizeCustomer: planning.Order.paperSizeCustomer,
                    quantity: qtyRegistered,
                });
                await deliveryRequest_1.DeliveryRequest.create({
                    planningId,
                    userId,
                    qtyRegistered,
                    volume,
                    status: "requested",
                }, { transaction });
                // Cập nhật trạng thái PlanningPaper
                await planningPaper_1.PlanningPaper.update({ deliveryPlanned: newDeliveryStatus }, { where: { planningId }, transaction });
                return {
                    message: "Xác nhận đăng ký giao hàng thành công",
                    data: { statusPlanning: newDeliveryStatus, volume },
                };
            });
        }
        catch (error) {
            console.error("❌ confirm ready delivery planning failed:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    //=================================PLANNING DELIVERY=====================================
    getDeliveryRequest: async () => {
        try {
            const request = await deliveryRepository_1.deliveryRepository.getDeliveryRequest();
            return { message: "get planning waiting delivery successfully", data: request };
        }
        catch (error) {
            console.error("❌ get planning waiting delivery failed:", error);
            throw appError_1.AppError.ServerError();
        }
    },
    //using for re-order  when hasn't confirm delivery
    getDeliveryPlanDetailForEdit: async (deliveryDate) => {
        try {
            const plan = await deliveryRepository_1.deliveryRepository.getDeliveryPlanByDate(deliveryDate);
            if (!plan) {
                return { message: "delivery for date hasn't plan", data: [] };
            }
            return {
                message: "get delivery plan detail for edit successfully",
                data: plan,
            };
        }
        catch (error) {
            console.error("❌ get planning detail for edit:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    createDeliveryPlan: async ({ deliveryDate, items, }) => {
        try {
            if (!deliveryDate || !items) {
                throw appError_1.AppError.BadRequest("Missing delivery data", "INVALID_PAYLOAD");
            }
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                // 1. get or create delivery plan
                const [plan] = await deliveryRepository_1.deliveryRepository.findOrCreateDeliveryPlan(deliveryDate, transaction);
                const existingItems = plan.DeliveryItems ?? [];
                const incomingRequestIds = items.map((i) => i.requestId);
                // 2. Xác định các Request bị loại khỏi kế hoạch
                const itemsToDelete = existingItems.filter((i) => !incomingRequestIds.includes(i.requestId));
                const requestIdsToReset = itemsToDelete.map((i) => i.requestId);
                // 3. Chuẩn bị dữ liệu để đồng bộ
                const existingMap = new Map(existingItems.map((i) => [i.requestId, i]));
                const allItemsToSync = items.map((item) => {
                    const existingItem = existingMap.get(item.requestId);
                    return {
                        ...(existingItem ? { deliveryItemId: existingItem.deliveryItemId } : {}),
                        deliveryId: plan.deliveryId,
                        requestId: item.requestId,
                        vehicleId: item.vehicleId,
                        sequence: item.sequence,
                        note: item.note ?? "",
                        status: "none",
                    };
                });
                // ----------- THỰC THI DATABASE --------------
                // Xóa những item không còn nằm trong danh sách xếp chuyến
                if (itemsToDelete.length > 0) {
                    await deliveryRepository_1.deliveryRepository.destroyItemById(itemsToDelete.map((i) => i.deliveryItemId), transaction);
                    // Trả trạng thái DeliveryRequest về 'requested' để có thể xếp chuyến khác
                    await deliveryRepository_1.deliveryRepository.updateDeliveryRequestStatus(requestIdsToReset, "requested", transaction);
                }
                // Cập nhật hoặc thêm mới các Item vào chuyến xe
                if (allItemsToSync.length > 0) {
                    await deliveryRepository_1.deliveryRepository.bulkUpsert(allItemsToSync, transaction);
                    // Cập nhật trạng thái các DeliveryRequest
                    await deliveryRepository_1.deliveryRepository.updateDeliveryRequestStatus(incomingRequestIds, "scheduled", transaction);
                }
                return { message: "Sync delivery plan success" };
            });
        }
        catch (error) {
            console.error("❌ Sync delivery plan failed:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    confirmForDeliveryPlanning: async (deliveryDate) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const existedPlan = await deliveryRepository_1.deliveryRepository.findOneDeliveryPlanByDate(deliveryDate, transaction);
                if (!existedPlan) {
                    throw appError_1.AppError.NotFound("Không tìm thấy kế hoạch để xác nhận", "DELIVERY_PLAN_NOT_FOUND");
                }
                //update status delivery plan
                await existedPlan.update({ status: "planned" }, { transaction });
                //update status delivery item
                await deliveryRepository_1.deliveryRepository.updateDeliveryItemById({
                    statusUpdate: "planned",
                    whereCondition: { deliveryId: existedPlan.deliveryId },
                    transaction,
                });
                return { message: "Chốt kế hoạch giao hàng thành công" };
            });
        }
        catch (error) {
            console.error("❌ confirm delivery planning failed:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    //=================================SCHEDULE DELIVERY=====================================
    getAllScheduleDelivery: async (deliveryDate) => {
        const cacheKey = schedule.date(deliveryDate);
        try {
            const { isChanged } = await cacheManager_1.CacheManager.check(deliveryPlan_1.DeliveryPlan, "schedule");
            if (isChanged) {
                await cacheManager_1.CacheManager.clear("schedule");
            }
            else {
                const cachedData = await redisCache_1.default.get(cacheKey);
                if (cachedData) {
                    if (devEnvironment)
                        console.log("✅ get schedule delivery from cache");
                    return { message: "get all schedule delivery from cache", data: JSON.parse(cachedData) };
                }
            }
            const finalData = await deliveryRepository_1.deliveryRepository.getAllDeliveryPlanByDate(deliveryDate, "planned");
            //save
            await redisCache_1.default.set(cacheKey, JSON.stringify(finalData), "EX", 3600);
            return { message: "get schedule delivery successfully", data: finalData };
        }
        catch (error) {
            console.error("❌ get schedule delivery failed:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    cancelOrCompleteDeliveryPlan: async ({ deliveryId, itemIds, action, }) => {
        try {
            return (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const items = await deliveryItem_1.DeliveryItem.findAll({
                    where: { deliveryItemId: { [sequelize_1.Op.in]: itemIds }, deliveryId },
                    include: [
                        {
                            model: deliveryRequest_1.DeliveryRequest,
                            attributes: ["requestId", "planningId"],
                        },
                    ],
                    transaction,
                });
                if (items.length === 0) {
                    throw appError_1.AppError.BadRequest("Không tìm thấy item nào để cập nhật", "ITEMS_NOT_FOUND");
                }
                const requestIds = items.map((i) => i.requestId);
                if (action === "complete") {
                    await deliveryRepository_1.deliveryRepository.updateDeliveryItemById({
                        statusUpdate: "completed",
                        whereCondition: { deliveryItemId: { [sequelize_1.Op.in]: itemIds }, deliveryId },
                        transaction,
                    });
                }
                else if (action === "cancel") {
                    const itemsCancel = await deliveryRepository_1.deliveryRepository.getDeliveryItemByIds(itemIds, transaction);
                    if (itemsCancel.length > 0) {
                        //return delivery request to 'requested' for re-schedule
                        await deliveryRequest_1.DeliveryRequest.update({ status: "requested" }, { where: { requestId: { [sequelize_1.Op.in]: requestIds } }, transaction });
                        //update delivery item status
                        await deliveryItem_1.DeliveryItem.update({ status: "cancelled" }, { where: { deliveryItemId: { [sequelize_1.Op.in]: itemIds } }, transaction });
                    }
                }
                //check order not in complete or cancel
                const remainingPlannedItems = await deliveryRepository_1.deliveryRepository.deliveryCount(deliveryId, transaction);
                //update delivery plan status if all items are completed or cancelled
                if (remainingPlannedItems === 0) {
                    await deliveryPlan_1.DeliveryPlan.update({ status: "completed" }, { where: { deliveryId }, transaction });
                }
                return {
                    message: `${action == "complete" ? "Hoàn thành" : "Hủy"} kế hoạch giao hàng thành công`,
                };
            });
        }
        catch (error) {
            console.error("❌ get schedule delivery failed:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    exportScheduleDelivery: async (res, deliveryDate) => {
        try {
            const data = await deliveryRepository_1.deliveryRepository.getAllDeliveryPlanByDate(deliveryDate);
            await (0, excelExporter_1.exportDeliveryExcelResponse)(res, {
                data: data,
                sheetName: "Lịch Giao Hàng",
                fileName: "delivery_schedule",
                columns: deliveryRowAndComlumn_1.deliveryColumns,
                rows: deliveryRowAndComlumn_1.mappingDeliveryRow,
            });
        }
        catch (error) {
            console.error("❌ Export Excel error:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
};
//# sourceMappingURL=deliveryService.js.map