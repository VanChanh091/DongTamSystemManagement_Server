"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getErrorProductionReport = exports.getRevenueReport = void 0;
const revenueService_1 = require("../../../service/synthetic/statistic/revenueService");
const errProductionService_1 = require("../../../service/synthetic/statistic/errProductionService");
//===========================REVENUE REPORT================================
const getRevenueReport = async (req, res, next) => {
    const { type, month, year, fromYear, toYear, targetUserId, page, pageSize, keyword, all } = req.query;
    try {
        let response;
        const isAll = all === "true";
        switch (type) {
            case "daily":
                response = await revenueService_1.statisticRevenueService.getDailyRevenueReport({
                    month: Number(month),
                    year: year ? Number(year) : undefined,
                    targetUserId: targetUserId ? Number(targetUserId) : null,
                    currentUser: req.user,
                    page: Number(page),
                    pageSize: Number(pageSize),
                    keyword: keyword ? String(keyword).trim() : undefined,
                    all: isAll,
                });
                break;
            case "monthly":
                response = await revenueService_1.statisticRevenueService.getMonthlyRevenueReport({
                    month: Number(month),
                    year: year ? Number(year) : undefined,
                    targetUserId: targetUserId ? Number(targetUserId) : null,
                    currentUser: req.user,
                    all: isAll,
                });
                break;
            case "yearly":
                if (!fromYear || !toYear) {
                    throw new Error("Both fromYear and toYear are required for yearly report");
                }
                response = await revenueService_1.statisticRevenueService.getMultiYearRevenueReport({
                    fromYear: Number(fromYear),
                    toYear: Number(toYear),
                    targetUserId: targetUserId ? Number(targetUserId) : null,
                    currentUser: req.user,
                    page: Number(page),
                    pageSize: Number(pageSize),
                    keyword: keyword ? String(keyword).trim() : undefined,
                    all: isAll,
                });
                break;
        }
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getRevenueReport = getRevenueReport;
//===========================ERROR PRODUCTION REPORT================================
const getErrorProductionReport = async (req, res, next) => {
    const { action, month, year, machine, employeeId, type } = req.query;
    try {
        let response;
        switch (action) {
            case "monthly":
                response = await errProductionService_1.statisticErrProductionService.getMonthlyErrorReport({
                    month: Number(month),
                    year: Number(year),
                    machine: machine ? String(machine).trim() : undefined,
                    employeeId: employeeId ? Number(employeeId) : undefined,
                    type: type,
                });
                break;
            case "yearly":
                break;
        }
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getErrorProductionReport = getErrorProductionReport;
//# sourceMappingURL=synthetic.statisticController.js.map