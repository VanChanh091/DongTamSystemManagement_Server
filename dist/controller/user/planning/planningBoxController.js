"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateIndex_TimeRunningBox = exports.acceptLackQtyBox = exports.confirmCompleteBox = exports.getPlanningBoxByfield = exports.getPlanningBox = void 0;
const planningBoxService_1 = require("../../../service/planning/planningBoxService");
const appError_1 = require("../../../utils/appError");
//get all planning box
const getPlanningBox = async (req, res, next) => {
    const { machine } = req.query;
    try {
        if (!machine) {
            throw appError_1.AppError.BadRequest("Missing machine parameter", "MISSING_PARAMETERS");
        }
        const response = await planningBoxService_1.planningBoxService.getPlanningBox(machine);
        return res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getPlanningBox = getPlanningBox;
//get by field
const getPlanningBoxByfield = async (req, res, next) => {
    const { machine, field, keyword } = req.query;
    try {
        const response = await planningBoxService_1.planningBoxService.getPlanningBoxByField(machine, field, keyword);
        return res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getPlanningBoxByfield = getPlanningBoxByfield;
const confirmCompleteBox = async (req, res, next) => {
    const { planningBoxIds, machine } = req.body;
    try {
        const response = await planningBoxService_1.planningBoxService.confirmCompletePlanningBox(planningBoxIds, machine);
        return res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.confirmCompleteBox = confirmCompleteBox;
const acceptLackQtyBox = async (req, res, next) => {
    const { planningBoxIds, newStatus, machine } = req.body;
    try {
        if (!Array.isArray(planningBoxIds) || planningBoxIds.length === 0) {
            throw appError_1.AppError.BadRequest("Missing planningBoxIds parameter", "MISSING_PARAMETERS");
        }
        const response = await planningBoxService_1.planningBoxService.acceptLackQtyBox(planningBoxIds, newStatus, machine);
        return res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.acceptLackQtyBox = acceptLackQtyBox;
//update index planning
const updateIndex_TimeRunningBox = async (req, res, next) => {
    const { machine, updateIndex, dayStart, timeStart, totalTimeWorking, isNewDay } = req.body;
    try {
        if (!Array.isArray(updateIndex) || updateIndex.length === 0) {
            throw appError_1.AppError.BadRequest("Missing updateIndex parameter", "MISSING_PARAMETERS");
        }
        const response = await planningBoxService_1.planningBoxService.updateIndex_TimeRunningBox({
            req,
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
exports.updateIndex_TimeRunningBox = updateIndex_TimeRunningBox;
//# sourceMappingURL=planningBoxController.js.map