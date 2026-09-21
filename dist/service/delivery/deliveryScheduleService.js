"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deliveryScheduleService = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const sequelize_1 = require("sequelize");
const meiliService_1 = require("../system/meiliService");
const appError_1 = require("../../utils/appError");
const labelFields_1 = require("../../assets/labelFields");
const cacheKey_1 = require("../../utils/helper/cache/cacheKey");
const planningBox_1 = require("../../models/planning/planningBox");
const qcSession_1 = require("../../models/qualityControl/qcSession");
const deliveryPlan_1 = require("../../models/delivery/deliveryPlan");
const deliveryItem_1 = require("../../models/delivery/deliveryItem");
const orderRepository_1 = require("../../repository/orderRepository");
const redis_connect_1 = __importDefault(require("../../assets/configs/connect/redis.connect"));
const planningPaper_1 = require("../../models/planning/planningPaper");
const cacheManager_1 = require("../../utils/helper/cache/cacheManager");
const outboundDetail_1 = require("../../models/warehouse/outbound/outboundDetail");
const deliveryRequest_1 = require("../../models/delivery/deliveryRequest");
const transactionHelper_1 = require("../../utils/helper/transactionHelper");
const deliveryRepository_1 = require("../../repository/deliveryRepository");
const manufactureRepository_1 = require("../../repository/manufactureRepository");
const inventoryRepository_1 = require("../../repository/inventoryRepository");
const excelExporter_1 = require("../../utils/helper/excelExporter");
const meiliTransformer_1 = require("../../assets/configs/meilisearch/meiliTransformer");
const deliveryRowAndComlumn_1 = require("../../utils/mapping/deliveryRowAndComlumn");
const devEnvironment = process.env.NODE_ENV !== "production";
const { schedule } = cacheKey_1.CacheKey.delivery;
exports.deliveryScheduleService = {
    //=================================SCHEDULE DELIVERY=====================================
    getAllScheduleDelivery: async (deliveryDate) => {
        const cacheKey = schedule.date(deliveryDate);
        try {
            const { isChanged } = await cacheManager_1.CacheManager.check([
                { model: deliveryItem_1.DeliveryItem },
                { model: outboundDetail_1.OutboundDetail, where: { deliveryItemId: { [sequelize_1.Op.ne]: null } } },
            ], "schedule");
            if (isChanged) {
                await cacheManager_1.CacheManager.clear("schedule");
            }
            else {
                const cachedData = await redis_connect_1.default.get(cacheKey);
                if (cachedData) {
                    if (devEnvironment)
                        console.log("✅ get schedule delivery from cache");
                    return { message: "get all schedule delivery from cache", data: JSON.parse(cachedData) };
                }
            }
            const finalData = await deliveryRepository_1.deliveryRepository.getAllDeliveryPlanByDate({
                deliveryDate,
                status: ["planned", "completed"],
            });
            //save
            await redis_connect_1.default.set(cacheKey, JSON.stringify(finalData), "EX", 3600);
            return { message: "get schedule delivery successfully", data: finalData };
        }
        catch (error) {
            console.error("❌ get schedule delivery failed:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    //start auto complete
    getDeliveryItemsByOrderId: async (orderId) => {
        try {
            const items = await deliveryRepository_1.deliveryRepository.searchOrderIdInDeliveryItem(orderId);
            return { message: "get delivery items by orderId successfully", data: items };
        }
        catch (error) {
            console.error("❌ get delivery items by orderId failed:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    getDeliveryItemsById: async (deliveryItemId) => {
        try {
            const items = await deliveryRepository_1.deliveryRepository.getDeliveryItemsById(deliveryItemId);
            return { message: "get delivery items by deliveryItemId successfully", data: items };
        }
        catch (error) {
            console.error("❌ get delivery items by deliveryItemId failed:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    //end auto complete
    cancelOrCompleteDeliveryPlan: async ({ deliveryId, itemIds, action, }) => {
        try {
            const STATUS_ERROR_MAP = {
                cancelled: {
                    message: "Không thể hoàn thành đơn đã bị hủy.",
                    code: "ITEMS_ALREADY_CANCELLED",
                },
                // planned: {
                //   message: "Có đơn chưa gửi yêu cầu chuẩn bị hàng",
                //   code: "ITEMS_STILL_REQUESTED",
                // },
                // requested: {
                //   message: "Có đơn chưa chuẩn bị hàng xong",
                //   code: "ITEMS_NOT_READY_PREPARED",
                // },
            };
            return (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const items = await deliveryRepository_1.deliveryRepository.getDeliveryItemToUpdateStatus(itemIds, transaction);
                if (items.length === 0) {
                    throw appError_1.AppError.BadRequest("Không tìm thấy item nào để cập nhật", "ITEMS_NOT_FOUND");
                }
                if (action === "complete") {
                    const invalidItem = items.find((i) => i.status in STATUS_ERROR_MAP);
                    if (invalidItem) {
                        const { message, code } = STATUS_ERROR_MAP[invalidItem.status];
                        throw appError_1.AppError.BadRequest(message, code);
                    }
                    //update status delivery item
                    await deliveryRepository_1.deliveryRepository.updateDeliveryItemById({
                        statusUpdate: "completed",
                        whereCondition: { deliveryItemId: { [sequelize_1.Op.in]: itemIds } },
                        transaction,
                    });
                    //finalize QC session and status request
                    const paperIds = new Set();
                    const boxIds = new Set();
                    const orderIds = new Set();
                    items.forEach((i) => {
                        const paper = i.DeliveryRequest?.PlanningPaper;
                        if (paper?.planningId) {
                            paperIds.add(paper.planningId);
                            if (paper.orderId) {
                                orderIds.add(paper.orderId);
                            }
                            // if hasBox, add boxId to set for update statusRequest
                            if (paper.hasBox && paper.PlanningBox?.planningBoxId) {
                                boxIds.add(paper.PlanningBox.planningBoxId);
                            }
                        }
                    });
                    const distinctPaperIds = Array.from(paperIds);
                    const distinctBoxIds = Array.from(boxIds);
                    const distinctOrderIds = Array.from(orderIds);
                    if (distinctPaperIds.length > 0) {
                        const updateTasks = [];
                        const inventories = await inventoryRepository_1.inventoryRepository.findByOrderIds({
                            orderIds: distinctOrderIds,
                            transaction,
                        });
                        const inventoryMap = new Map(inventories.map((inv) => [inv.orderId, inv]));
                        const orders = await orderRepository_1.orderRepository.getOrdersByIds({
                            orderIds: distinctOrderIds,
                            transaction,
                        });
                        const orderMap = new Map(orders.map((order) => [order.orderId, order]));
                        for (const planningId of distinctPaperIds) {
                            const paper = await planningPaper_1.PlanningPaper.findByPk(planningId, { transaction });
                            if (paper && paper.orderId) {
                                const currentInventory = inventoryMap.get(paper.orderId);
                                const currentOrder = orderMap.get(paper.orderId);
                                let isFullyDelivered = false;
                                if (currentInventory && currentOrder) {
                                    // ĐIỀU KIỆN CHUẨN: So sánh Tổng xuất kho thực tế với Số lượng cần sản xuất gốc
                                    // Ví dụ: Nhập 10,010 | Cần sx 10,000 | Xuất đợt một 5,000 -> 5,000 >= 10,000 (False) -> Giữ 'planned'
                                    // Xuất đợt hai thêm 5,000 (Tổng xuất 10,000) -> 10,000 >= 10,000 (True) -> delivered
                                    isFullyDelivered =
                                        currentInventory.totalQtyOutbound >= currentOrder.quantityManufacture;
                                }
                                updateTasks.push(planningPaper_1.PlanningPaper.update({ deliveryPlanned: isFullyDelivered ? "delivered" : "planned" }, { where: { planningId }, transaction }));
                                updateTasks.push(qcSession_1.QcSession.update({ status: "finalized" }, { where: { planningId }, transaction }));
                            }
                        }
                        // Nếu có Box thì add vào updateTaskss
                        if (distinctBoxIds.length > 0) {
                            updateTasks.push(planningBox_1.PlanningBox.update({ statusRequest: "finalize" }, { where: { planningBoxId: { [sequelize_1.Op.in]: distinctBoxIds } }, transaction }), qcSession_1.QcSession.update({ status: "finalized" }, { where: { planningBoxId: { [sequelize_1.Op.in]: distinctBoxIds } }, transaction }));
                        }
                        await Promise.all(updateTasks);
                    }
                }
                else if (action === "cancel") {
                    const itemsCancel = await deliveryRepository_1.deliveryRepository.getDeliveryItemByIds(itemIds, transaction);
                    if (itemsCancel.length > 0) {
                        //return delivery request to 'requested' for re-schedule
                        const requestIds = items.map((i) => i.requestId);
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
                //--------------------MEILISEARCH-----------------------
                const requestIds = items.map((i) => i.requestId);
                const requestData = await deliveryRepository_1.deliveryRepository.syncManyDeliveryRequestForMeili(requestIds, transaction);
                if (requestData.length > 0) {
                    const flattenData = requestData.map((item) => meiliTransformer_1.meiliTransformer.deliveryRequest(item));
                    await meiliService_1.meiliService.syncOrUpdateMeiliData({
                        indexKey: labelFields_1.MEILI_INDEX.DELIVERY_REQUEST,
                        data: flattenData,
                        transaction,
                        isUpdate: true,
                    });
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
    _syncOrderForMeili: async (orderIds, transaction) => {
        try {
            const ordersForMeili = await orderRepository_1.orderRepository.syncOrdersForMeili({ orderIds, transaction });
            if (ordersForMeili.length > 0) {
                const dataToSync = ordersForMeili.map((o) => meiliTransformer_1.meiliTransformer.order(o));
                await meiliService_1.meiliService.syncOrUpdateMeiliData({
                    indexKey: labelFields_1.MEILI_INDEX.ORDERS,
                    data: dataToSync,
                    transaction,
                    isUpdate: true,
                });
            }
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
            const data = await deliveryRepository_1.deliveryRepository.getAllDeliveryPlanByDate({ deliveryDate });
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
    //=================================PREPARE GOODS=====================================
    getRequestPrepareGoods: async (deliveryDate) => {
        try {
            const finalData = await deliveryRepository_1.deliveryRepository.getAllDeliveryPlanByDate({
                deliveryDate,
                itemStatus: ["requested", "prepared"],
            });
            return { message: "get schedule delivery successfully", data: finalData };
        }
        catch (error) {
            console.error("❌ Get request prepare goods failed:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    requestOrPreparedGoods: async ({ deliveryItemIds, isRequest, empCode, lisencePlate, }) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const items = await deliveryItem_1.DeliveryItem.findAll({
                    where: { deliveryItemId: { [sequelize_1.Op.in]: deliveryItemIds } },
                    transaction,
                });
                if (items.length === 0) {
                    throw appError_1.AppError.BadRequest("Không tìm thấy mục nào", "ITEMS_NOT_FOUND");
                }
                const now = new Date();
                if (isRequest) {
                    // Gửi yêu cầu (Chuyển từ planned -> requested)
                    const alreadyRequested = items.filter((i) => i.status === "requested");
                    if (alreadyRequested.length > 0) {
                        throw appError_1.AppError.BadRequest(`Có ${alreadyRequested.length} đơn đã được yêu cầu trước đó`, "ALREADY_REQUESTED");
                    }
                    // Lọc các item có thể update (status = planned)
                    const validIds = items.filter((i) => i.status === "planned").map((i) => i.deliveryItemId);
                    if (validIds.length > 0) {
                        await deliveryItem_1.DeliveryItem.update({ status: "requested", dayRequested: now, licensePlate: lisencePlate }, { where: { deliveryItemId: { [sequelize_1.Op.in]: validIds } }, transaction });
                    }
                    return { message: `Gửi yêu cầu thành công cho ${validIds.length} đơn hàng` };
                }
                else {
                    // Chuẩn bị hàng (Chuyển từ requested -> prepared)
                    const employee = await manufactureRepository_1.manufactureRepo.getEmployeeByCode(empCode, transaction);
                    if (!employee) {
                        throw appError_1.AppError.NotFound("Mã nhân viên không tồn tại", "EMPLOYEE_NOT_FOUND");
                    }
                    const validIds = items
                        .filter((i) => i.status === "requested")
                        .map((i) => i.deliveryItemId);
                    if (validIds.length > 0) {
                        await deliveryItem_1.DeliveryItem.update({
                            status: "prepared",
                            dayCompleted: now,
                            recipient: employee.fullName,
                        }, { where: { deliveryItemId: validIds }, transaction });
                        // Xóa cache sau khi cập nhật thành công
                        await cacheManager_1.CacheManager.clear("schedule");
                    }
                    return { message: "Xác nhận chuẩn bị hàng xong" };
                }
            });
        }
        catch (error) {
            console.error("❌ request prepare goods failed:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    updateLicensePlate: async ({ deliveryItemId, newLicensePlate, }) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const deliveryItem = await deliveryItem_1.DeliveryItem.findByPk(deliveryItemId, { transaction });
                if (!deliveryItem) {
                    throw appError_1.AppError.NotFound("Không tìm thấy mục giao hàng", "ITEM_NOT_FOUND");
                }
                await deliveryItem.update({ licensePlate: newLicensePlate }, { transaction });
                return { message: "Cập nhật biển số xe thành công" };
            });
        }
        catch (error) {
            console.error("❌ update license plate failed:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    //socket
    notifyRequestPrepareGoods: async (req) => {
        try {
            const item = { message: "Có đơn hàng mới cần chuẩn bị hàng" };
            //bắt buộc có event để socket.on bên client có thể nhận, nếu không có event sẽ không nhận được data
            req.io?.to("prepare-goods").emit("prepare-goods-event", item);
            return { message: "Đã gửi yêu cầu chuẩn bị hàng" };
        }
        catch (error) {
            console.error("❌Lỗi khi gửi socket:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
};
//# sourceMappingURL=deliveryScheduleService.js.map