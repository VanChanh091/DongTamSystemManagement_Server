"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportExcelSyntheticPlanning = exports.getSyntheticPlanning = void 0;
const synthetic_planningService_1 = require("../../../service/synthetic/synthetic.planningService");
//get all dashboard planning
const getSyntheticPlanning = async (req, res, next) => {
    const { field, keyword, page, pageSize, status, planningId } = req.query;
    try {
        let response;
        if (status) {
            response = await synthetic_planningService_1.syntheticPlanningService.getAllSyntheticPlanning(Number(page), Number(pageSize), status);
        }
        else if (field && keyword) {
            response = await synthetic_planningService_1.syntheticPlanningService.getSyntheticPlanningByFields({
                field,
                keyword,
                page: Number(page),
                pageSize: Number(pageSize),
            });
        }
        else if (planningId) {
            response = await synthetic_planningService_1.syntheticPlanningService.getSyntheticPlanningDetail(Number(planningId));
        }
        else {
            response = await synthetic_planningService_1.syntheticPlanningService.getAllSyntheticPlanningStage();
        }
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getSyntheticPlanning = getSyntheticPlanning;
//export excel
const exportExcelSyntheticPlanning = async (req, res, next) => {
    try {
        await synthetic_planningService_1.syntheticPlanningService.exportExcelSyntheticPlanning(req, res);
    }
    catch (error) {
        next(error);
    }
};
exports.exportExcelSyntheticPlanning = exportExcelSyntheticPlanning;
//# sourceMappingURL=synthetic.planningController.js.map