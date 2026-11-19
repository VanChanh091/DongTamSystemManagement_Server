"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.triggerDebtSnapshot = exports.saveYearlyTargets = exports.getYearlyActionPlan = void 0;
const actionPlanService_1 = require("../../service/admin/actionPlanService");
const getYearlyActionPlan = async (req, res, next) => {
    const year = Number(req.query.year) || new Date().getFullYear();
    try {
        const result = await actionPlanService_1.actionPlanService.getYearlyActionPlan({ year });
        return res.status(200).json(result);
    }
    catch (error) {
        next(error);
    }
};
exports.getYearlyActionPlan = getYearlyActionPlan;
const saveYearlyTargets = async (req, res, next) => {
    const { year, targets } = req.body;
    try {
        const result = await actionPlanService_1.actionPlanService.saveYearlyTargets({
            year: Number(year),
            targetsList: targets,
            updatedBy: req.user.fullName,
        });
        return res.status(200).json(result);
    }
    catch (error) {
        next(error);
    }
};
exports.saveYearlyTargets = saveYearlyTargets;
const triggerDebtSnapshot = async (req, res, next) => {
    const { year, month, closingDay, snapshotDate } = {
        ...req.query,
        ...req.body,
    };
    try {
        const result = await actionPlanService_1.actionPlanService.captureDebtSnapshot({
            snapshotDate: snapshotDate ? new Date(snapshotDate) : new Date(),
            year: year ? Number(year) : undefined,
            month: month ? Number(month) : undefined,
            closingDay: closingDay ? Number(closingDay) : undefined,
            isCron: false,
        });
        return res.status(200).json(result);
    }
    catch (error) {
        next(error);
    }
};
exports.triggerDebtSnapshot = triggerDebtSnapshot;
//# sourceMappingURL=actionPlanController.js.map