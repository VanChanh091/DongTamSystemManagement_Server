"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deliveryRequestService = void 0;
const sequelize_1 = require("sequelize");
const meiliService_1 = require("../system/meiliService");
const appError_1 = require("../../utils/appError");
const labelFields_1 = require("../../assets/labelFields");
const planningPaper_1 = require("../../models/planning/planningPaper");
const outboundDetail_1 = require("../../models/warehouse/outbound/outboundDetail");
const transactionHelper_1 = require("../../utils/helper/transactionHelper");
const deliveryRequest_1 = require("../../models/delivery/deliveryRequest");
const deliveryRepository_1 = require("../../repository/deliveryRepository");
const meilisearch_connect_1 = require("../../assets/configs/connect/meilisearch.connect");
exports.deliveryRequestService = {
    getDeliveryRequest: async () => {
        try {
            const request = await deliveryRepository_1.deliveryRepository.getDeliveryRequest({});
            return { message: "get delivery request successfully", data: request };
        }
        catch (error) {
            console.error("❌ get delivery request failed:", error);
            throw appError_1.AppError.ServerError();
        }
    },
    getDeliveryRequestByField: async (field, keyword) => {
        try {
            const validFields = ["orderId", "customerName"];
            if (!validFields.includes(field)) {
                throw appError_1.AppError.BadRequest(`Field '${field}' is not supported for search`, "INVALID_FIELD");
            }
            const index = meilisearch_connect_1.meiliClient.index("deliveryRequest");
            // Tìm kiếm trên Meilisearch để lấy orderId
            const searchResult = await index.search(keyword, {
                filter: 'status = "requested"',
                attributesToSearchOn: [field],
                attributesToRetrieve: ["requestId"], // Chỉ lấy requestId
            });
            const requestIds = searchResult.hits.map((hit) => hit.requestId);
            if (requestIds.length === 0) {
                return { message: "No delivery requests found", data: [] };
            }
            const request = await deliveryRepository_1.deliveryRepository.getDeliveryRequest({
                isSearch: "true",
                requestId: requestIds,
            });
            // Sắp xếp lại thứ tự của SQL theo đúng thứ tự của Meilisearch
            const finalData = requestIds
                .map((id) => request.find((r) => r.requestId === id))
                .filter(Boolean);
            return {
                message: "Get delivery request from Meilisearch & DB successfully",
                data: finalData,
            };
        }
        catch (error) {
            console.error("❌ get delivery request failed:", error);
            throw appError_1.AppError.ServerError();
        }
    },
    //using for re-order when hasn't confirm delivery
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
            console.error("❌ get delivery plan detail for edit:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    //lưu kế hoạch giao hàng
    createDeliveryPlan: async ({ deliveryDate, items, }) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                if (!deliveryDate || !items) {
                    throw appError_1.AppError.BadRequest("Missing delivery data", "INVALID_PAYLOAD");
                }
                // get or create delivery plan
                const [plan] = await deliveryRepository_1.deliveryRepository.findOrCreateDeliveryPlan(deliveryDate, transaction);
                const existingItems = plan.DeliveryItems ?? [];
                const incomingRequestIds = items.map((i) => i.requestId);
                const itemsToDelete = existingItems.filter((i) => !incomingRequestIds.includes(i.requestId));
                //==========================Handle item bị xóa khỏi xe===============================
                if (itemsToDelete.length > 0) {
                    const deleteItemIds = itemsToDelete.map((i) => i.deliveryItemId);
                    //check item đã được xuất kho chưa
                    const hasOutboundDetail = await outboundDetail_1.OutboundDetail.findOne({
                        where: { deliveryItemId: { [sequelize_1.Op.in]: deleteItemIds } },
                        transaction,
                    });
                    if (hasOutboundDetail) {
                        throw appError_1.AppError.BadRequest("Không thể di chuyển đơn hàng đã được xuất kho", "HAS_DELIVERY_ITEM_OUTBOUND");
                    }
                    const requestIdsToReset = itemsToDelete.map((i) => i.requestId);
                    const planningIdsToReset = [
                        ...new Set(itemsToDelete.map((i) => i.DeliveryRequest?.planningId).filter(Boolean)),
                    ];
                    await deliveryRepository_1.deliveryRepository.destroyItemById(deleteItemIds, transaction);
                    // Trả trạng thái DeliveryRequest về 'requested' để có thể xếp chuyến khác
                    await deliveryRepository_1.deliveryRepository.updateRequestStatus(requestIdsToReset, "requested", transaction);
                    // Cập nhật PlanningPaper -> 'pending'
                    if (planningIdsToReset.length > 0) {
                        await planningPaper_1.PlanningPaper.update({ deliveryPlanned: "pending" }, { where: { planningId: { [sequelize_1.Op.in]: planningIdsToReset } }, transaction });
                    }
                }
                //==========================Handle item được thêm vào xe===============================
                if (items.length > 0) {
                    const existingMap = new Map(existingItems.map((i) => [i.requestId, i]));
                    const allItemsToSync = items.map((item) => {
                        const existing = existingMap.get(item.requestId);
                        return {
                            ...(existing ? { deliveryItemId: existing.deliveryItemId } : {}),
                            deliveryId: plan.deliveryId,
                            requestId: item.requestId,
                            vehicleId: item.vehicleId,
                            sequence: item.sequence,
                            note: item.note ?? "",
                            status: existing ? existing.status : "none",
                            idxOrder: item.idxOrder,
                        };
                    });
                    // Cập nhật hoặc thêm mới các Item vào chuyến xe
                    await deliveryRepository_1.deliveryRepository.bulkUpsert(allItemsToSync, transaction);
                    // Cập nhật trạng thái các DeliveryRequest
                    await deliveryRepository_1.deliveryRepository.updateRequestStatus(incomingRequestIds, "scheduled", transaction);
                    // Chỉ tìm planningId của những request mà ta chưa biết (những thằng mới thêm vào)
                    const newRequestIds = items
                        .filter((i) => !existingMap.has(i.requestId))
                        .map((i) => i.requestId);
                    // Lấy planningId từ existing items đã có sẵn
                    const knownPlanningIds = items
                        .filter((i) => existingMap.has(i.requestId))
                        .map((i) => existingMap.get(i.requestId)?.DeliveryRequest?.planningId)
                        .filter(Boolean);
                    let finalPlanningIdsToPlanned = [...knownPlanningIds];
                    if (newRequestIds.length > 0) {
                        const newRequests = await deliveryRequest_1.DeliveryRequest.findAll({
                            where: { requestId: newRequestIds },
                            attributes: ["planningId"],
                            transaction,
                        });
                        newRequests.forEach((r) => {
                            if (r.planningId)
                                finalPlanningIdsToPlanned.push(r.planningId);
                        });
                    }
                    // 1 Query Update duy nhất cho PlanningPaper
                    const uniquePlanningIds = [...new Set(finalPlanningIdsToPlanned)].filter((id) => id !== null && id !== undefined);
                    if (uniquePlanningIds.length > 0) {
                        await planningPaper_1.PlanningPaper.update({ deliveryPlanned: "planned" }, { where: { planningId: { [sequelize_1.Op.in]: uniquePlanningIds } }, transaction });
                    }
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
    //triển khai kế hoạch giao hàng
    implementDeliveryPlan: async (req, deliveryDate) => {
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
                    whereCondition: { deliveryId: existedPlan.deliveryId, status: "none" },
                    transaction,
                });
                //socket
                const item = { message: "Lịch Giao Hàng Đã Được Cập Nhật" };
                const dateStr = deliveryDate.toISOString().split("T")[0];
                //bắt buộc có event để socket.on bên client có thể nhận, nếu không có event sẽ không nhận được data
                req.io?.to(`delivery-${dateStr}`).emit("delivery-schedule-event", item);
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
    backDeliveryRequest: async (requestIds) => {
        try {
            return (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const idArray = Array.isArray(requestIds) ? requestIds : [requestIds];
                const requests = await deliveryRepository_1.deliveryRepository.getDeliveryPlanByIds({
                    requestId: idArray,
                    transaction,
                });
                if (requests.length === 0) {
                    throw appError_1.AppError.NotFound("Không tìm thấy yêu cầu giao hàng để trả về", "DELIVERY_REQUEST_NOT_FOUND");
                }
                const planningIds = [...new Set(requests.map((r) => r.planningId))];
                await deliveryRequest_1.DeliveryRequest.destroy({
                    where: { requestId: { [sequelize_1.Op.in]: idArray } },
                    transaction,
                });
                for (const pId of planningIds) {
                    const remainingCount = await deliveryRequest_1.DeliveryRequest.count({
                        where: { planningId: pId },
                        transaction,
                    });
                    const newStatus = remainingCount === 0 ? "none" : "pending";
                    await planningPaper_1.PlanningPaper.update({ deliveryPlanned: newStatus }, { where: { planningId: pId }, transaction });
                }
                //--------------------MEILISEARCH-----------------------
                await meiliService_1.meiliService.deleteMeiliData({
                    indexKey: labelFields_1.MEILI_INDEX.DELIVERY_REQUEST,
                    idOrIds: idArray,
                    transaction,
                });
                return { message: "Trả yêu cầu giao hàng thành công" };
            });
        }
        catch (error) {
            console.error("❌ Back delivery request to planning failed:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
};
//# sourceMappingURL=deliveryRequestService.js.map