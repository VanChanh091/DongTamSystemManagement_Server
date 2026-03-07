"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePlanningBoxes = exports.updateIndex_TimeRunningBox = exports.getPlanningBoxes = void 0;
const planningBoxService_1 = require("../../../service/planning/planningBoxService");
const appError_1 = require("../../../utils/appError");
const getPlanningBoxes = async (req, res, next) => {
    const { machine, field, keyword } = req.query;
    try {
        if (!machine) {
            throw appError_1.AppError.BadRequest("Missing machine parameter", "MISSING_PARAMETERS");
        }
        let response;
        // 1. Nhánh tìm kiếm theo field
        if (field && keyword) {
            response = await planningBoxService_1.planningBoxService.getPlanningBoxByField(machine, field, keyword);
        }
        // 2. Nhánh lấy tất cả
        else {
            response = await planningBoxService_1.planningBoxService.getPlanningBox(machine);
        }
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getPlanningBoxes = getPlanningBoxes;
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
const updatePlanningBoxes = async (req, res, next) => {
    const { planningBoxIds, machine, newStatus, isConfirm } = req.body;
    try {
        if (!Array.isArray(planningBoxIds) || planningBoxIds.length === 0) {
            throw appError_1.AppError.BadRequest("Missing planningBoxIds parameter", "MISSING_PARAMETERS");
        }
        let response;
        // 1. Xác nhận sản xuất
        if (isConfirm) {
            response = await planningBoxService_1.planningBoxService.confirmCompletePlanningBox(planningBoxIds, machine);
        }
        // 2. Tạm dừng hoặc chấp nhận thiếu
        else if (newStatus) {
            response = await planningBoxService_1.planningBoxService.acceptLackQtyBox(planningBoxIds, newStatus, machine);
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
exports.updatePlanningBoxes = updatePlanningBoxes;
//# sourceMappingURL=planningBoxController.js.map