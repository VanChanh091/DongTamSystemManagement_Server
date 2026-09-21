"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateReportBox = exports.addReportBox = exports.getPlanningBox = exports.updateReportPaper = exports.addReportPaper = exports.getPlanningPaper = void 0;
const appError_1 = require("../../../utils/appError");
const manufacturePaperService_1 = require("../../../service/manufacture/manufacturePaperService");
const manufactureBoxService_1 = require("../../../service/manufacture/manufactureBoxService");
//===============================MANUFACTURE PAPER=====================================
//get planning machine paper
const getPlanningPaper = async (req, res, next) => {
    const { machine, filterType = "all", dayCompleted, shiftProduction, } = req.query;
    try {
        if (!machine) {
            throw appError_1.AppError.BadRequest("Missing machine parameter", "MISSING_PARAMETERS");
        }
        let response;
        if (shiftProduction && dayCompleted) {
            response = await manufacturePaperService_1.manuPaperService.getPaperByDateAndShift({
                machine,
                shiftProduction,
                dayCompleted: new Date(dayCompleted),
            });
        }
        else {
            response = await manufacturePaperService_1.manuPaperService.getPlanningPaper({ machine, filterType });
        }
        return res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getPlanningPaper = getPlanningPaper;
//create report for machine
const addReportPaper = async (req, res, next) => {
    const { planningId } = req.query;
    try {
        const response = await manufacturePaperService_1.manuPaperService.addReportPaper({
            planningId: Number(planningId),
            data: req.body,
            user: req.user,
        });
        return res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.addReportPaper = addReportPaper;
const updateReportPaper = async (req, res, next) => {
    const { planningId, action } = req.query;
    try {
        if (!planningId || !action) {
            throw appError_1.AppError.BadRequest("Missing planningId or action parameter", "MISSING_PARAMETERS");
        }
        const idArray = (Array.isArray(planningId) ? planningId : [planningId])
            .map((id) => Number(id))
            .filter((id) => !isNaN(id));
        if (idArray.length === 0) {
            throw appError_1.AppError.BadRequest("Invalid planningId format", "INVALID_PARAMETERS");
        }
        let response;
        switch (action) {
            case "EDIT_REPORT":
                response = await manufacturePaperService_1.manuPaperService.updateReportPaper({
                    planningId: idArray[0],
                    updateData: req.body,
                    user: req.user,
                });
                break;
            case "REQUEST_COMPLETE":
                response = await manufacturePaperService_1.manuPaperService.requestCompletePlanningPaper({ planningId: idArray });
                break;
            case "CONFIRM_PRODUCING":
                response = await manufacturePaperService_1.manuPaperService.confirmProducingPaper({
                    req,
                    planningId: idArray[0],
                    user: req.user,
                });
                break;
            case "CONFIRM_FIX_ERROR":
                response = await manufacturePaperService_1.manuPaperService.confirmFixedErr({ planningId: idArray[0] });
                break;
            default:
                throw appError_1.AppError.BadRequest("Invalid action parameter", "INVALID_ACTION");
        }
        return res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateReportPaper = updateReportPaper;
//===============================MANUFACTURE BOX=====================================
//get all planning box
const getPlanningBox = async (req, res, next) => {
    const { machine } = req.query;
    try {
        if (!machine) {
            throw appError_1.AppError.BadRequest("Missing machine parameter", "MISSING_PARAMETERS");
        }
        const response = await manufactureBoxService_1.manuBoxService.getPlanningBox(machine);
        return res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getPlanningBox = getPlanningBox;
//create report for machine
const addReportBox = async (req, res, next) => {
    const { planningBoxId, machine } = req.query;
    try {
        const response = await manufactureBoxService_1.manuBoxService.addReportBox(Number(planningBoxId), machine, req.body);
        return res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.addReportBox = addReportBox;
const updateReportBox = async (req, res, next) => {
    const { planningBoxId, machine, action } = req.query;
    try {
        if (!planningBoxId || !action) {
            throw appError_1.AppError.BadRequest("Missing planningBoxId or action parameter", "MISSING_PARAMETERS");
        }
        const idArray = (Array.isArray(planningBoxId) ? planningBoxId : [planningBoxId])
            .map((id) => Number(id))
            .filter((id) => !isNaN(id));
        if (idArray.length === 0) {
            throw appError_1.AppError.BadRequest("Invalid planningId format", "INVALID_PARAMETERS");
        }
        let response;
        switch (action) {
            case "EDIT_REPORT":
                response = await manufactureBoxService_1.manuBoxService.updateReportBox(idArray[0], machine, req.body);
                break;
            case "REQUEST_COMPLETE":
                response = await manufactureBoxService_1.manuBoxService.requestCompletePlanningBox(idArray, machine);
                break;
            case "REQUEST_STOCK_CHECK":
                //send request to check quality product
                response = await manufactureBoxService_1.manuBoxService.updateRequestStockCheck(idArray[0], machine);
                break;
            case "CONFIRM_PRODUCING":
                response = await manufactureBoxService_1.manuBoxService.confirmProducingBox(req, idArray[0], machine, req.user);
                break;
            case "CONFIRM_FIX_ERROR":
                response = await manufactureBoxService_1.manuBoxService.confirmFixedErr(idArray[0], machine);
                break;
            default:
                throw appError_1.AppError.BadRequest("Invalid action parameter", "INVALID_ACTION");
        }
        return res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateReportBox = updateReportBox;
//# sourceMappingURL=manufactureController.js.map