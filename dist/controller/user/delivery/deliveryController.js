"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyPrepareGoods = exports.requestOrPrepareGoods = exports.getRequestPrepareGoods = exports.exportScheduleDelivery = exports.cancelOrCompleteDeliveryPlan = exports.getAllScheduleDelivery = exports.confirmForDeliveryPlanning = exports.createDeliveryPlan = exports.getPlanningRequest = exports.registerQtyDelivery = exports.getPlanningEstimateTime = void 0;
const deliveryService_1 = require("../../../service/deliveryService");
//=================================PLANNING ESTIMATE TIME=====================================
const getPlanningEstimateTime = async (req, res, next) => {
    const { page, pageSize, dayStart, estimateTime } = req.query;
    try {
        const response = await deliveryService_1.deliveryService.getPlanningEstimateTime({
            page: Number(page),
            pageSize: Number(pageSize),
            dayStart: new Date(dayStart),
            estimateTime,
            userId: req.user.userId,
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getPlanningEstimateTime = getPlanningEstimateTime;
const registerQtyDelivery = async (req, res, next) => {
    const { planningId, qtyRegistered } = req.body;
    try {
        const response = await deliveryService_1.deliveryService.registerQtyDelivery({
            planningId: Number(planningId),
            qtyRegistered: Number(qtyRegistered),
            userId: req.user.userId,
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.registerQtyDelivery = registerQtyDelivery;
//=================================DELIVERY PLANNING=====================================
const getPlanningRequest = async (req, res, next) => {
    const { deliveryDate } = req.query;
    try {
        let response;
        if (deliveryDate) {
            response = await deliveryService_1.deliveryService.getDeliveryPlanDetailForEdit(new Date(deliveryDate));
        }
        else {
            response = await deliveryService_1.deliveryService.getDeliveryRequest();
        }
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getPlanningRequest = getPlanningRequest;
const createDeliveryPlan = async (req, res, next) => {
    const { deliveryDate, items } = req.body;
    try {
        const response = await deliveryService_1.deliveryService.createDeliveryPlan({ deliveryDate, items });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.createDeliveryPlan = createDeliveryPlan;
const confirmForDeliveryPlanning = async (req, res, next) => {
    const { deliveryDate } = req.query;
    try {
        const response = await deliveryService_1.deliveryService.confirmForDeliveryPlanning(new Date(deliveryDate));
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.confirmForDeliveryPlanning = confirmForDeliveryPlanning;
//=================================SCHEDULE DELIVERY=====================================
const getAllScheduleDelivery = async (req, res, next) => {
    const { deliveryDate } = req.query;
    try {
        const response = await deliveryService_1.deliveryService.getAllScheduleDelivery(new Date(deliveryDate));
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getAllScheduleDelivery = getAllScheduleDelivery;
const cancelOrCompleteDeliveryPlan = async (req, res, next) => {
    const { deliveryId } = req.query;
    const { itemIds, action } = req.body;
    try {
        const response = await deliveryService_1.deliveryService.cancelOrCompleteDeliveryPlan({
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
        await deliveryService_1.deliveryService.exportScheduleDelivery(res, new Date(deliveryDate));
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
        const response = await deliveryService_1.deliveryService.getRequestPrepareGoods(new Date(deliveryDate));
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getRequestPrepareGoods = getRequestPrepareGoods;
const requestOrPrepareGoods = async (req, res, next) => {
    const { deliveryItemId, isRequest } = req.query;
    try {
        const response = await deliveryService_1.deliveryService.requestOrPrepareGoods(Number(deliveryItemId), isRequest);
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.requestOrPrepareGoods = requestOrPrepareGoods;
//socket
const notifyPrepareGoods = async (req, res, next) => {
    try {
        const response = await deliveryService_1.deliveryService.notifyRequestPrepareGoods(req);
        return res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.notifyPrepareGoods = notifyPrepareGoods;
//# sourceMappingURL=deliveryController.js.map