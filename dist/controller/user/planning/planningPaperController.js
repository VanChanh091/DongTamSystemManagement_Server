"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyUpdatePlanning = exports.updateIndex_TimeRunning = exports.updatePlanningPapers = exports.getPlanningPapers = void 0;
const planningPaperService_1 = require("../../../service/planning/planningPaperService");
const appError_1 = require("../../../utils/appError");
const getPlanningPapers = async (req, res, next) => {
    const { machine, field, keyword } = req.query;
    try {
        if (!machine) {
            throw appError_1.AppError.BadRequest("Missing machine parameter", "MISSING_PARAMETERS");
        }
        let response;
        // 1. Nhánh tìm kiếm theo field
        if (field && keyword) {
            response = await planningPaperService_1.planningPaperService.getPlanningByField(machine, field, keyword);
        }
        // 2. Nhánh lấy tất cả
        else {
            response = await planningPaperService_1.planningPaperService.getPlanningPaperByMachine(machine);
        }
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getPlanningPapers = getPlanningPapers;
const updatePlanningPapers = async (req, res, next) => {
    const { planningIds, newMachine, newStatus, rejectReason, isConfirm } = req.body;
    try {
        if (!Array.isArray(planningIds) || planningIds.length === 0) {
            throw appError_1.AppError.BadRequest("Missing planningIds parameter", "MISSING_PARAMETERS");
        }
        let response;
        // 1. Đổi máy
        if (newMachine) {
            response = await planningPaperService_1.planningPaperService.changeMachinePlanning(planningIds, newMachine);
        }
        // 2. Xác nhận sản xuất
        else if (isConfirm) {
            response = await planningPaperService_1.planningPaperService.confirmCompletePlanningPaper(planningIds);
        }
        // 3. Tạm dừng hoặc chấp nhận thiếu
        else if (newStatus) {
            response = await planningPaperService_1.planningPaperService.pauseOrAcceptLackQtyPLanning(planningIds, newStatus, rejectReason);
        }
        else {
            throw appError_1.AppError.BadRequest("No valid action provided", "INVALID_ACTION");
        }
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updatePlanningPapers = updatePlanningPapers;
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