"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.countWaitingCheck = exports.countPlanningStop = exports.countOrderPendingPlanning = exports.countOrderRejected = exports.countOrderPending = void 0;
const badgeService_1 = require("../../service/badge/badgeService");
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
//order reject
const countOrderRejected = async (req, res, next) => {
    try {
        const response = await badgeService_1.badgeService.countOrderRejected(req.user.userId);
        return res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.countOrderRejected = countOrderRejected;
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
        else {
            throw appError_1.AppError.BadRequest("Invalid type query parameter. Must be 'paper' or 'box'.");
        }
        return res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.countWaitingCheck = countWaitingCheck;
//# sourceMappingURL=badgeController.js.map