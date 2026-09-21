"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyPrepareGoods = exports.handleUpdatePreparedGoods = exports.getRequestPrepareGoods = exports.exportScheduleDelivery = exports.cancelOrCompleteDeliveryPlan = exports.getDeliveryItemsByOrderId = exports.getAllScheduleDelivery = exports.implementDeliveryPlan = exports.handlePostDeliveryRequest = exports.getPlanningRequest = exports.handlePutDelivery = exports.getPlanningEstimateTime = void 0;
const appError_1 = require("../../../utils/appError");
const deliveryEstimateService_1 = require("../../../service/delivery/deliveryEstimateService");
const deliveryRequestService_1 = require("../../../service/delivery/deliveryRequestService");
const deliveryScheduleService_1 = require("../../../service/delivery/deliveryScheduleService");
//=================================PLANNING ESTIMATE TIME=====================================
const getPlanningEstimateTime = async (req, res, next) => {
    const { page, pageSize, dayStart, estimateTime, all, field, keyword } = req.query;
    try {
        let response;
        const params = {
            page: Number(page),
            pageSize: Number(pageSize),
            dayStart: new Date(dayStart),
            estimateTime,
            userId: req.user.userId,
            all,
        };
        if (field && keyword) {
            response = await deliveryEstimateService_1.deliveryEstimateService.getPlanningEstimateByField({
                ...params,
                field,
                keyword,
            });
        }
        else {
            response = await deliveryEstimateService_1.deliveryEstimateService.getPlanningEstimateTime(params);
        }
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getPlanningEstimateTime = getPlanningEstimateTime;
const handlePutDelivery = async (req, res, next) => {
    const { planningId, qtyRegistered, note, isPaper, action } = req.body;
    try {
        let response;
        switch (action) {
            case "REGISTER_QTY":
                response = await deliveryEstimateService_1.deliveryEstimateService.registerQtyDelivery({
                    planningId: Number(planningId),
                    userId: req.user.userId,
                    qtyRegistered: Number(qtyRegistered),
                    note: note,
                });
                break;
            case "CLOSE_PLANNING":
                const planningIds = Array.isArray(planningId)
                    ? planningId.map(Number)
                    : [Number(planningId)];
                response = await deliveryEstimateService_1.deliveryEstimateService.closePlanning({
                    planningIds: planningIds,
                    isPaper: isPaper || false,
                });
                break;
            default:
                throw appError_1.AppError.BadRequest("Invalid action parameter", "INVALID_ACTION");
        }
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.handlePutDelivery = handlePutDelivery;
//=================================DELIVERY REQUEST=====================================
const getPlanningRequest = async (req, res, next) => {
    const { deliveryDate, field, keyword } = req.query;
    try {
        let response;
        if (deliveryDate) {
            response = await deliveryRequestService_1.deliveryRequestService.getDeliveryPlanDetailForEdit(new Date(deliveryDate));
        }
        else if (field && keyword) {
            response = await deliveryRequestService_1.deliveryRequestService.getDeliveryRequestByField(field, keyword);
        }
        else {
            response = await deliveryRequestService_1.deliveryRequestService.getDeliveryRequest();
        }
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getPlanningRequest = getPlanningRequest;
const handlePostDeliveryRequest = async (req, res, next) => {
    const { deliveryDate, items, requestIds } = req.body;
    try {
        let response;
        if (deliveryDate && items) {
            response = await deliveryRequestService_1.deliveryRequestService.createDeliveryPlan({ deliveryDate, items });
        }
        else {
            const ids = Array.isArray(requestIds) ? requestIds.map(Number) : [Number(requestIds)];
            response = await deliveryRequestService_1.deliveryRequestService.backDeliveryRequest(ids);
        }
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.handlePostDeliveryRequest = handlePostDeliveryRequest;
const implementDeliveryPlan = async (req, res, next) => {
    const { deliveryDate } = req.query;
    try {
        const response = await deliveryRequestService_1.deliveryRequestService.implementDeliveryPlan(req, new Date(deliveryDate));
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.implementDeliveryPlan = implementDeliveryPlan;
//=================================DELIVERY SCHEDULE=====================================
const getAllScheduleDelivery = async (req, res, next) => {
    const { deliveryDate } = req.query;
    try {
        const response = await deliveryScheduleService_1.deliveryScheduleService.getAllScheduleDelivery(new Date(deliveryDate));
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getAllScheduleDelivery = getAllScheduleDelivery;
const getDeliveryItemsByOrderId = async (req, res, next) => {
    const { orderId, deliveryItemId } = req.query;
    try {
        let response;
        if (orderId) {
            response = await deliveryScheduleService_1.deliveryScheduleService.getDeliveryItemsByOrderId(orderId);
        }
        else {
            response = await deliveryScheduleService_1.deliveryScheduleService.getDeliveryItemsById(Number(deliveryItemId));
        }
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getDeliveryItemsByOrderId = getDeliveryItemsByOrderId;
const cancelOrCompleteDeliveryPlan = async (req, res, next) => {
    const { deliveryId } = req.query;
    const { itemIds, action } = req.body;
    try {
        const response = await deliveryScheduleService_1.deliveryScheduleService.cancelOrCompleteDeliveryPlan({
            deliveryId: Number(deliveryId),
            itemIds,
            action,
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.cancelOrCompleteDeliveryPlan = cancelOrCompleteDeliveryPlan;
//export excel
const exportScheduleDelivery = async (req, res, next) => {
    const { deliveryDate } = req.query;
    try {
        await deliveryScheduleService_1.deliveryScheduleService.exportScheduleDelivery(res, new Date(deliveryDate));
    }
    catch (error) {
        next(error);
    }
};
exports.exportScheduleDelivery = exportScheduleDelivery;
//=================================PREPARE GOODS=====================================
const getRequestPrepareGoods = async (req, res, next) => {
    const { deliveryDate } = req.query;
    try {
        const response = await deliveryScheduleService_1.deliveryScheduleService.getRequestPrepareGoods(new Date(deliveryDate));
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getRequestPrepareGoods = getRequestPrepareGoods;
const handleUpdatePreparedGoods = async (req, res, next) => {
    const { deliveryItemIds, isRequest, empCode, lisencePlate, action } = req.body;
    try {
        const itemIds = Array.isArray(deliveryItemIds)
            ? deliveryItemIds.map(Number)
            : [Number(deliveryItemIds)];
        let response;
        switch (action) {
            case "REQUEST":
                response = await deliveryScheduleService_1.deliveryScheduleService.requestOrPreparedGoods({
                    deliveryItemIds: itemIds,
                    isRequest,
                    empCode: empCode ?? "",
                    lisencePlate: lisencePlate ?? "",
                });
                break;
            case "CHANGE_LICENSE_PLATE":
                response = await deliveryScheduleService_1.deliveryScheduleService.updateLicensePlate({
                    deliveryItemId: itemIds[0],
                    newLicensePlate: lisencePlate ?? "",
                });
                break;
            default:
                throw appError_1.AppError.BadRequest("Invalid action parameter", "INVALID_ACTION");
        }
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.handleUpdatePreparedGoods = handleUpdatePreparedGoods;
//socket
const notifyPrepareGoods = async (req, res, next) => {
    try {
        const response = await deliveryScheduleService_1.deliveryScheduleService.notifyRequestPrepareGoods(req);
        return res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.notifyPrepareGoods = notifyPrepareGoods;
//# sourceMappingURL=deliveryController.js.map