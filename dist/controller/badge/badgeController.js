"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.countRequestPrepareGoods = exports.countDeliveryRequest = exports.countWaitingCheck = exports.countPlanningStop = exports.countOrderPendingPlanning = exports.countOrderPending = void 0;
const badgeService_1 = require("../../service/system/badgeService");
const appError_1 = require("../../utils/appError");
//pending order
const countOrderPending = async (req, res, next) => {
    try {
        const response = await badgeService_1.badgeService.countOrderPending();
        return res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.countOrderPending = countOrderPending;
//order pending planning
const countOrderPendingPlanning = async (req, res, next) => {
    try {
        const response = await badgeService_1.badgeService.countOrderPendingPlanning();
        return res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.countOrderPendingPlanning = countOrderPendingPlanning;
//planning stop
const countPlanningStop = async (req, res, next) => {
    try {
        const response = await badgeService_1.badgeService.countPlanningStop();
        return res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.countPlanningStop = countPlanningStop;
//waiting check paper & box
const countWaitingCheck = async (req, res, next) => {
    const { type } = req.query;
    try {
        let response;
        if (type === "paper") {
            response = await badgeService_1.badgeService.countWaitingCheckPaper();
        }
        else if (type === "box") {
            response = await badgeService_1.badgeService.countWaitingCheckBox();
        }
        else if (type === "scrap") {
            response = await badgeService_1.badgeService.countWaitingCheckScrapReport();
        }
        else {
            throw appError_1.AppError.BadRequest("Invalid type query parameter. Must be 'paper', 'box', or 'scrap'.");
        }
        return res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.countWaitingCheck = countWaitingCheck;
//delivery request
const countDeliveryRequest = async (req, res, next) => {
    try {
        const response = await badgeService_1.badgeService.countDeliveryRequest();
        return res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.countDeliveryRequest = countDeliveryRequest;
//prepare goods
const countRequestPrepareGoods = async (req, res, next) => {
    try {
        const response = await badgeService_1.badgeService.countRequestPrepareGoods();
        return res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.countRequestPrepareGoods = countRequestPrepareGoods;
//# sourceMappingURL=badgeController.js.map