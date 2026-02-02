"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelOrContinuePlannning = exports.getPlanningStop = exports.planningOrder = exports.getOrderAccept = void 0;
const planningStatusService_1 = require("../../../service/planning/planningStatusService");
const appError_1 = require("../../../utils/appError");
///contain planning order and stop
//===============================PLANNING ORDER=====================================
//getOrderAccept
const getOrderAccept = async (req, res, next) => {
    try {
        const response = await planningStatusService_1.planningStatusService.getOrderAccept();
        return res.status(200).json({
            ...response,
            message: response.fromCache
                ? "get all order have status:accept from cache"
                : "get all order have status:accept",
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getOrderAccept = getOrderAccept;
//planning order
const planningOrder = async (req, res, next) => {
    const { orderId } = req.query;
    const planningData = req.body;
    try {
        if (!orderId) {
            throw appError_1.AppError.BadRequest("Missing orderId or newStatus", "MISSING_PARAMETERS");
        }
        const response = await planningStatusService_1.planningStatusService.planningOrder(orderId, planningData);
        return res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.planningOrder = planningOrder;
//===============================PLANNING STOP=====================================
const getPlanningStop = async (req, res, next) => {
    const { page = 1, pageSize = 20 } = req.query;
    try {
        const response = await planningStatusService_1.planningStatusService.getPlanningStop(Number(page), Number(pageSize));
        return res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getPlanningStop = getPlanningStop;
const cancelOrContinuePlannning = async (req, res, next) => {
    const { planningId, action } = req.body;
    try {
        const ids = Array.isArray(planningId)
            ? planningId.map((id) => Number(id)) // convert từng phần tử
            : [Number(planningId)];
        const response = await planningStatusService_1.planningStatusService.cancelOrContinuePlannning({
            planningId: ids,
            action,
        });
        return res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.cancelOrContinuePlannning = cancelOrContinuePlannning;
//# sourceMappingURL=planningStatusController.js.map