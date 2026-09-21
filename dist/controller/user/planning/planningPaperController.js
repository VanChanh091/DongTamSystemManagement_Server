"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportExcelPlanningPaper = exports.notifyUpdatePlanning = exports.updateIndex_TimeRunning = exports.handleUpdatePlanningPapers = exports.getPlanningPapers = void 0;
const appError_1 = require("../../../utils/appError");
const planningPaperService_1 = require("../../../service/planning/planningPaperService");
const getPlanningPapers = async (req, res, next) => {
    const { machine, field, keyword } = req.query;
    try {
        if (!machine) {
            throw appError_1.AppError.BadRequest("Missing machine parameter", "MISSING_PARAMETERS");
        }
        let response;
        // 1. Nhánh tìm kiếm theo field
        if (field && keyword) {
            response = await planningPaperService_1.planningPaperService.getPlanningByField({ machine, field, keyword });
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
const handleUpdatePlanningPapers = async (req, res, next) => {
    const { action, planningIds, newMachine, newStatus, note, forceComplete } = req.body;
    try {
        const planningIdsArrs = Array.isArray(planningIds) ? planningIds : [planningIds];
        if (!planningIdsArrs[0] || planningIdsArrs.length === 0 || !action) {
            throw appError_1.AppError.BadRequest("Missing planningIds or action parameter", "MISSING_PARAMETERS");
        }
        let response;
        switch (action) {
            case "CHANGE_MACHINE":
                if (newMachine) {
                    response = await planningPaperService_1.planningPaperService.changeMachinePlanning(planningIdsArrs, newMachine);
                }
                break;
            case "CONFIRM_COMPLETE":
                response = await planningPaperService_1.planningPaperService.completePlanningPaper(planningIdsArrs, forceComplete);
                break;
            case "PAUSE_OR_ACCEPT_LACK":
                if (newStatus) {
                    response = await planningPaperService_1.planningPaperService.pauseOrAcceptLackQtyPLanning({
                        planningIds: planningIdsArrs,
                        newStatus,
                        username: req.user.fullName,
                    });
                }
                break;
            case "NOTE":
                if (note)
                    response = await planningPaperService_1.planningPaperService.addNoteToPlanning(planningIdsArrs[0], note);
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
exports.handleUpdatePlanningPapers = handleUpdatePlanningPapers;
//update index & time running
const updateIndex_TimeRunning = async (req, res, next) => {
    const { machine, updateIndex, dayStart, timeStart, totalTimeWorking } = req.body;
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
        });
        return res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateIndex_TimeRunning = updateIndex_TimeRunning;
//socket
const notifyUpdatePlanning = async (req, res, next) => {
    const { machine, keyName, isPlan } = req.body;
    try {
        const response = await planningPaperService_1.planningPaperService.notifyUpdatePlanning({
            req,
            isPlan,
            machine,
            keyName,
            senderId: req.user?.userId,
        });
        return res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.notifyUpdatePlanning = notifyUpdatePlanning;
const exportExcelPlanningPaper = async (req, res, next) => {
    const { machine, isAll } = req.body;
    try {
        const response = await planningPaperService_1.planningPaperService.exportExcelPlanningOrder(res, machine, isAll);
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.exportExcelPlanningPaper = exportExcelPlanningPaper;
//# sourceMappingURL=planningPaperController.js.map