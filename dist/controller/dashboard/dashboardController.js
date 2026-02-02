"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllDbPlanningStage = exports.exportExcelDbPlanning = exports.getDbPlanningByFields = exports.getDbPlanningDetail = exports.getAllDashboardPlanning = void 0;
const dashboardService_1 = require("../../service/dashboardService");
//get all dashboard planning
const getAllDashboardPlanning = async (req, res, next) => {
    const { page, pageSize, status } = req.query;
    try {
        const response = await dashboardService_1.dashboardService.getAllDashboardPlanning(Number(page), Number(pageSize), status);
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getAllDashboardPlanning = getAllDashboardPlanning;
const getDbPlanningDetail = async (req, res, next) => {
    const { planningId } = req.query;
    try {
        const response = await dashboardService_1.dashboardService.getDbPlanningDetail(Number(planningId));
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getDbPlanningDetail = getDbPlanningDetail;
const getDbPlanningByFields = async (req, res, next) => {
    const { field, keyword, page, pageSize } = req.query;
    try {
        const response = await dashboardService_1.dashboardService.getDbPlanningByFields({
            field,
            keyword,
            page: Number(page),
            pageSize: Number(pageSize),
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getDbPlanningByFields = getDbPlanningByFields;
//export excel
const exportExcelDbPlanning = async (req, res, next) => {
    try {
        await dashboardService_1.dashboardService.exportExcelDbPlanning(req, res);
    }
    catch (error) {
        next(error);
    }
};
exports.exportExcelDbPlanning = exportExcelDbPlanning;
const getAllDbPlanningStage = async (req, res, next) => {
    try {
        const response = await dashboardService_1.dashboardService.getAllDbPlanningStage();
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getAllDbPlanningStage = getAllDbPlanningStage;
//# sourceMappingURL=dashboardController.js.map