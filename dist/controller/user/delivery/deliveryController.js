"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportScheduleDelivery = exports.cancelOrCompleteDeliveryPlan = exports.getAllScheduleDelivery = exports.confirmForDeliveryPlanning = exports.createDeliveryPlan = exports.getDeliveryPlanDetailForEdit = exports.getPlanningPendingDelivery = exports.confirmReadyDeliveryPlanning = exports.getPlanningEstimateTime = void 0;
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
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getPlanningEstimateTime = getPlanningEstimateTime;
const confirmReadyDeliveryPlanning = async (req, res, next) => {
    const { planningIds } = req.query;
    try {
        const ids = Array.isArray(planningIds) ? planningIds : planningIds ? [planningIds] : [];
        const response = await deliveryService_1.deliveryService.confirmReadyDeliveryPlanning({
            planningIds: ids.map((id) => Number(id)),
            userId: req.user.userId,
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.confirmReadyDeliveryPlanning = confirmReadyDeliveryPlanning;
//=================================PLANNING DELIVERY=====================================
const getPlanningPendingDelivery = async (req, res, next) => {
    try {
        const response = await deliveryService_1.deliveryService.getPlanningPendingDelivery();
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getPlanningPendingDelivery = getPlanningPendingDelivery;
const getDeliveryPlanDetailForEdit = async (req, res, next) => {
    const { deliveryDate } = req.query;
    try {
        const response = await deliveryService_1.deliveryService.getDeliveryPlanDetailForEdit(new Date(deliveryDate));
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getDeliveryPlanDetailForEdit = getDeliveryPlanDetailForEdit;
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
//# sourceMappingURL=deliveryController.js.map