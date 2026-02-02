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
const deliveryRepository_1 = require("../repository/deliveryRepository");
const transactionHelper_1 = require("../utils/helper/transactionHelper");
const planningPaper_1 = require("../models/planning/planningPaper");
const deliveryItem_1 = require("../models/delivery/deliveryItem");
const deliveryPlan_1 = require("../models/delivery/deliveryPlan");
const excelExporter_1 = require("../utils/helper/excelExporter");
const deliveryRowAndComlumn_1 = require("../utils/mapping/deliveryRowAndComlumn");
const deliveryHelper_1 = require("../utils/helper/modelHelper/deliveryHelper");
const devEnvironment = process.env.NODE_ENV !== "production";
exports.deliveryService = {
    //================================PLANNING ESTIMATE TIME==================================
    getPlanningEstimateTime: async ({ page = 1, pageSize = 20, dayStart, estimateTime, }) => {
        try {
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
            const paperPlannings = await deliveryRepository_1.deliveryRepository.getPlanningEstimateTime(dayStart);
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
            return responseData;
        }
        catch (error) {
            console.error("❌ get planning estimate time failed:", error);
            throw appError_1.AppError.ServerError();
        }
    },
    confirmReadyDeliveryPlanning: async ({ planningIds, userId, }) => {
        try {
            if (!planningIds || planningIds.length === 0) {
                throw appError_1.AppError.BadRequest("Danh sách planning rỗng", "EMPTY_PLANNING_LIST");
            }
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const plannings = await deliveryRepository_1.deliveryRepository.getPaperDeliveryPlanned(planningIds, transaction);
                if (plannings.length !== planningIds.length) {
                    throw appError_1.AppError.BadRequest("Một số planning không tồn tại hoặc đã được xác nhận", "INVALID_PLANNING_IDS");
                }
                const overflowPlanning = plannings.find((p) => p.hasOverFlow);
                if (overflowPlanning) {
                    throw appError_1.AppError.BadRequest(`Planning ${overflowPlanning.planningId} bị overflow`, "PLANNING_OVERFLOW");
                }
                const planningIdMap = plannings.map((p) => p.planningId);
                await planningPaper_1.PlanningPaper.update({ deliveryPlanned: "pending" }, { where: { planningId: planningIdMap }, transaction });
                // await DeliveryRequest.bulkCreate(
                //   planningIdMap.map((planningId) => ({ planningId, userId, status: "requested" })),
                //   { transaction },
                // );
                return { message: "confirm ready delivery planning successfully" };
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
    getPlanningPendingDelivery: async () => {
        try {
            const data = await deliveryRepository_1.deliveryRepository.getPlanningPendingDelivery();
            return { message: "get planning waiting delivery successfully", data };
        }
        catch (error) {
            console.error("❌ get planning waiting delivery failed:", error);
            throw appError_1.AppError.ServerError();
        }
    },
    // getDeliveryRequest: async () => {
    //   try {
    //     const request = await deliveryRepository.getDeliveryRequest();
    //     return { message: "get planning waiting delivery successfully", data: request };
    //   } catch (error) {
    //     console.error("❌ get planning waiting delivery failed:", error);
    //     throw AppError.ServerError();
    //   }
    // },
    //using for re-order  when hasn't confirm delivery
    getDeliveryPlanDetailForEdit: async (deliveryDate) => {
        try {
            const plan = await deliveryRepository_1.deliveryRepository.getDeliveryPlanByDate(deliveryDate);
            if (!plan) {
                return {
                    message: "delivery for date has no plan",
                    data: [],
                };
            }
            // const results: any[] = [];
            const items = plan.DeliveryItems ?? [];
            //step 1: get all planning detail
            const paperIds = items.filter((i) => i.targetType === "paper").map((i) => i.targetId);
            const boxIds = items.filter((i) => i.targetType === "box").map((i) => i.targetId);
            const boxes = boxIds.length > 0 ? await deliveryRepository_1.deliveryRepository.getAllBoxByIds(boxIds, true) : [];
            //map planningBoxId to planningId
            const boxIdToPlanningIdMap = Object.fromEntries(boxes.map((b) => [b.planningBoxId, b.planningId]));
            const allPlanningIds = [...paperIds, ...boxes.map((b) => b.planningId).filter((id) => id)];
            //step 2: get all planning paper detail
            const paperData = allPlanningIds.length > 0 ? await deliveryRepository_1.deliveryRepository.getAllPaperByIds(allPlanningIds) : [];
            //create map for quick access
            const paperMap = Object.fromEntries(paperData.map((p) => [p.planningId, p]));
            //step 3: merge data
            const results = items.map((item) => {
                const itemPlain = item.get({ plain: true });
                const targetId = item.targetType === "paper" ? item.targetId : boxIdToPlanningIdMap[item.targetId];
                let paperInfo = paperMap[targetId] ? { ...paperMap[targetId] } : null;
                return { ...itemPlain, Planning: paperInfo };
            });
            return {
                message: "get delivery plan detail for edit successfully",
                data: [
                    {
                        deliveryId: plan.deliveryId,
                        deliveryDate: plan.deliveryDate,
                        status: plan.status,
                        DeliveryItems: results,
                    },
                ],
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
                //group boxIds
                const incomingBoxIds = items.filter((i) => i.targetType === "box").map((i) => i.targetId);
                const existingBoxIds = existingItems
                    .filter((i) => i.targetType === "box")
                    .map((i) => i.targetId);
                const allBoxIds = [...new Set([...incomingBoxIds, ...existingBoxIds])];
                //map boxId to planningId
                const boxToPaperMap = new Map();
                if (allBoxIds.length > 0) {
                    const boxes = await deliveryRepository_1.deliveryRepository.getAllBoxByIds(allBoxIds, false);
                    boxes.forEach((b) => boxToPaperMap.set(b.planningBoxId, b.planningId));
                }
                const existingMap = new Map(existingItems.map((i) => [`${i.targetType}-${i.targetId}`, i]));
                const incomingKeys = new Set(items.map((i) => `${i.targetType}-${i.targetId}`));
                const paperIdsToPlanned = new Set();
                const paperIdsToReset = new Set();
                // Tạo mảng để Bulk Sync (Vừa Create vừa Update)
                const allItemsToSync = items.map((item) => {
                    const key = `${item.targetType}-${item.targetId}`;
                    const existingItem = existingMap.get(key);
                    // Thu thập PlanningId để cập nhật trạng thái "Planned"
                    const pId = item.targetType === "paper" ? item.targetId : boxToPaperMap.get(item.targetId);
                    if (pId)
                        paperIdsToPlanned.add(pId);
                    return {
                        //if has old ID then pass to DB for UPDATE, else INSERT
                        ...(existingItem ? { deliveryItemId: existingItem.deliveryItemId } : {}),
                        deliveryId: plan.deliveryId,
                        targetType: item.targetType,
                        targetId: item.targetId,
                        vehicleId: item.vehicleId,
                        sequence: item.sequence,
                        note: item.note ?? "",
                        status: existingItem ? existingItem.status : "none",
                    };
                });
                const itemsToDelete = existingItems.filter((i) => !incomingKeys.has(`${i.targetType}-${i.targetId}`));
                //delete item out of list
                if (itemsToDelete.length > 0) {
                    itemsToDelete.forEach((delItem) => {
                        const pId = delItem.targetType === "paper"
                            ? delItem.targetId
                            : boxToPaperMap.get(delItem.targetId);
                        if (pId)
                            paperIdsToReset.add(pId);
                    });
                    await deliveryRepository_1.deliveryRepository.destroyItemById(itemsToDelete.map((i) => i.deliveryItemId), transaction);
                }
                //create or update items
                if (allItemsToSync.length > 0) {
                    await deliveryRepository_1.deliveryRepository.bulkUpsert(allItemsToSync, transaction);
                }
                if (paperIdsToPlanned.size > 0) {
                    await deliveryRepository_1.deliveryRepository.updatePlanningPaperById({
                        planningIds: [...paperIdsToPlanned],
                        status: "planned",
                        transaction,
                    });
                }
                //reset pending for removed items
                const finalResetIds = [...paperIdsToReset].filter((id) => !paperIdsToPlanned.has(id));
                if (finalResetIds.length > 0) {
                    await deliveryRepository_1.deliveryRepository.updatePlanningPaperById({
                        planningIds: finalResetIds,
                        status: "pending",
                        transaction,
                    });
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
                let existedPlan = await deliveryRepository_1.deliveryRepository.findOneDeliveryPlanByDate(deliveryDate, transaction);
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
        try {
            const finalData = await (0, deliveryHelper_1.getDeliveryByDate)(deliveryDate, "planned");
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
                        const paperIds = itemsCancel
                            .filter((i) => i.targetType === "paper")
                            .map((i) => i.targetId);
                        const boxIds = itemsCancel.filter((i) => i.targetType === "box").map((i) => i.targetId);
                        const boxes = boxIds.length > 0 ? await deliveryRepository_1.deliveryRepository.getAllBoxByIds(boxIds, true) : [];
                        const allPlanningIds = [
                            ...paperIds,
                            ...boxes.map((b) => b.planningId).filter((id) => id),
                        ];
                        //update planning paper deliveryPlanned to pending
                        await planningPaper_1.PlanningPaper.update({ deliveryPlanned: "pending" }, { where: { planningId: allPlanningIds }, transaction });
                        //update delivery item status
                        await deliveryItem_1.DeliveryItem.update({ status: "cancelled" }, { where: { deliveryItemId: itemIds, deliveryId }, transaction });
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
            const data = await (0, deliveryHelper_1.getDeliveryByDate)(deliveryDate);
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