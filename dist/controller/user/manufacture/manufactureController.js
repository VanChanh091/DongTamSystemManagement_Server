"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateRequestStockCheck = exports.confirmProducingBox = exports.addReportBox = exports.getPlanningBox = exports.confirmProducingPaper = exports.addReportPaper = exports.getPlanningPaper = void 0;
const manufactureService_1 = require("../../../service/manufactureService");
const appError_1 = require("../../../utils/appError");
//===============================MANUFACTURE PAPER=====================================
//get planning machine paper
const getPlanningPaper = async (req, res, next) => {
    const { machine } = req.query;
    try {
        if (!machine) {
            throw appError_1.AppError.BadRequest("Missing machine parameter", "MISSING_PARAMETERS");
        }
        const response = await manufactureService_1.manufactureService.getPlanningPaper(machine);
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
        const response = await manufactureService_1.manufactureService.addReportPaper(Number(planningId), req.body, req.user);
        return res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.addReportPaper = addReportPaper;
//confirm producing paper
const confirmProducingPaper = async (req, res, next) => {
    const { planningId } = req.query;
    try {
        if (!planningId) {
            throw appError_1.AppError.BadRequest("Missing planningId parameter", "MISSING_PARAMETERS");
        }
        const response = await manufactureService_1.manufactureService.confirmProducingPaper(Number(planningId), req.user);
        return res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.confirmProducingPaper = confirmProducingPaper;
//===============================MANUFACTURE BOX=====================================
//get all planning box
const getPlanningBox = async (req, res, next) => {
    const { machine } = req.query;
    try {
        if (!machine) {
            throw appError_1.AppError.BadRequest("Missing machine parameter", "MISSING_PARAMETERS");
        }
        const response = await manufactureService_1.manufactureService.getPlanningBox(machine);
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
        const response = await manufactureService_1.manufactureService.addReportBox(Number(planningBoxId), machine, req.body);
        return res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.addReportBox = addReportBox;
//confirm producing box
const confirmProducingBox = async (req, res, next) => {
    const { planningBoxId, machine } = req.query;
    try {
        if (!planningBoxId || !machine) {
            throw appError_1.AppError.BadRequest("Missing planningBoxId parameter", "MISSING_PARAMETERS");
        }
        const response = await manufactureService_1.manufactureService.confirmProducingBox(Number(planningBoxId), machine, req.user);
        return res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.confirmProducingBox = confirmProducingBox;
//send request to check quality product
const updateRequestStockCheck = async (req, res, next) => {
    const { planningBoxId, machine } = req.query;
    try {
        if (!planningBoxId) {
            throw appError_1.AppError.BadRequest("Missing planningBoxId parameter", "MISSING_PARAMETERS");
        }
        const response = await manufactureService_1.manufactureService.updateRequestStockCheck(Number(planningBoxId), machine);
        return res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateRequestStockCheck = updateRequestStockCheck;
//# sourceMappingURL=manufactureController.js.map