"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.countWaitingCheckBox = exports.countWaitingCheckPaper = exports.countPlanningStop = exports.countOrderPendingPlanning = exports.countOrderRejected = exports.countOrderPending = void 0;
const badgeService_1 = require("../../service/badge/badgeService");
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
const countWaitingCheckPaper = async (req, res, next) => {
    try {
        const response = await badgeService_1.badgeService.countWaitingCheckPaper();
        return res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.countWaitingCheckPaper = countWaitingCheckPaper;
const countWaitingCheckBox = async (req, res, next) => {
    try {
        const response = await badgeService_1.badgeService.countWaitingCheckBox();
        return res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.countWaitingCheckBox = countWaitingCheckBox;
//# sourceMappingURL=badgeController.js.map