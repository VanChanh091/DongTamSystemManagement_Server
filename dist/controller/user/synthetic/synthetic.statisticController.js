"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReportProduction = exports.getErrorProductionReport = exports.getRevenueReport = void 0;
const revenueService_1 = require("../../../service/synthetic/statistic/revenueService");
const errProductionService_1 = require("../../../service/synthetic/statistic/errProductionService");
const appError_1 = require("../../../utils/appError");
const productionReportService_1 = require("../../../service/synthetic/statistic/productionReportService");
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
                response = await errProductionService_1.statisticErrProductionService.getYearlyErrorReport({
                    year: Number(year),
                    machine: machine ? String(machine).trim() : undefined,
                    employeeId: employeeId ? Number(employeeId) : undefined,
                    type: type,
                });
                break;
        }
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getErrorProductionReport = getErrorProductionReport;
//===========================REPORT PRODUCTION================================
const getReportProduction = async (req, res, next) => {
    const { startDate, endDate } = req.query;
    try {
        if (!startDate) {
            throw appError_1.AppError.BadRequest("startDate là bắt buộc (YYYY-MM-DD)");
        }
        const result = await productionReportService_1.productionReportService.getReportProduction({
            startDate: String(startDate),
            endDate: endDate ? String(endDate) : undefined,
        });
        return res.status(200).json(result);
    }
    catch (error) {
        next(error);
    }
};
exports.getReportProduction = getReportProduction;
//# sourceMappingURL=synthetic.statisticController.js.map