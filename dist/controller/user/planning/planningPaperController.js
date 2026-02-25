"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyUpdatePlanning = exports.updateIndex_TimeRunning = exports.pauseOrAcceptLackQtyPLanning = exports.confirmCompletePaper = exports.changeMachinePlanning = exports.getPlanningPaperByfield = exports.getPlanningByMachine = void 0;
const planningPaperService_1 = require("../../../service/planning/planningPaperService");
const appError_1 = require("../../../utils/appError");
//===============================PRODUCTION QUEUE=====================================
//get planning by machine
const getPlanningByMachine = async (req, res, next) => {
    const { machine } = req.query;
    try {
        if (!machine) {
            throw appError_1.AppError.BadRequest("Missing machine parameter", "MISSING_PARAMETERS");
        }
        const response = await planningPaperService_1.planningPaperService.getPlanningByMachine(machine);
        return res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getPlanningByMachine = getPlanningByMachine;
//get planning paper by field
const getPlanningPaperByfield = async (req, res, next) => {
    const { machine, field, keyword } = req.query;
    try {
        const response = await planningPaperService_1.planningPaperService.getPlanningByField(machine, field, keyword);
        return res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getPlanningPaperByfield = getPlanningPaperByfield;
//change planning machine
const changeMachinePlanning = async (req, res, next) => {
    const { planningIds, newMachine } = req.body;
    try {
        if (!Array.isArray(planningIds) || planningIds.length === 0) {
            throw appError_1.AppError.BadRequest("Missing planningIds parameter", "MISSING_PARAMETERS");
        }
        const response = await planningPaperService_1.planningPaperService.changeMachinePlanning(planningIds, newMachine);
        return res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.changeMachinePlanning = changeMachinePlanning;
//confirm complete
const confirmCompletePaper = async (req, res, next) => {
    const { planningIds } = req.body;
    try {
        const response = await planningPaperService_1.planningPaperService.confirmCompletePlanningPaper(planningIds);
        return res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.confirmCompletePaper = confirmCompletePaper;
//pause or accept lack of qty
const pauseOrAcceptLackQtyPLanning = async (req, res, next) => {
    const { planningIds, newStatus, rejectReason } = req.body;
    try {
        if (!Array.isArray(planningIds) || planningIds.length === 0) {
            throw appError_1.AppError.BadRequest("Missing planningIds parameter", "MISSING_PARAMETERS");
        }
        const response = await planningPaperService_1.planningPaperService.pauseOrAcceptLackQtyPLanning(planningIds, newStatus, rejectReason);
        return res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.pauseOrAcceptLackQtyPLanning = pauseOrAcceptLackQtyPLanning;
//update index & time running
const updateIndex_TimeRunning = async (req, res, next) => {
    const { machine, updateIndex, dayStart, timeStart, totalTimeWorking, isNewDay } = req.body;
    try {
        if (!Array.isArray(updateIndex) || updateIndex.length === 0) {
            throw appError_1.AppError.BadRequest("Missing updateIndex parameter", "MISSING_PARAMETERS");
        }
        const response = await planningPaperService_1.planningPaperService.updateIndex_TimeRunning({
            machine: machine,
            updateIndex: updateIndex,
            dayStart: dayStart,
            timeStart: timeStart,
            totalTimeWorking: totalTimeWorking,
            isNewDay,
        });
        return res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateIndex_TimeRunning = updateIndex_TimeRunning;
//update index & time running
const notifyUpdatePlanning = async (req, res, next) => {
    const { machine, keyName, isPlan } = req.body;
    try {
        const response = await planningPaperService_1.planningPaperService.notifyUpdatePlanning(req, isPlan, machine, keyName);
        return res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.notifyUpdatePlanning = notifyUpdatePlanning;
//# sourceMappingURL=planningPaperController.js.map