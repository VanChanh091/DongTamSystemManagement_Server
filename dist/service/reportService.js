"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportService = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const sequelize_1 = require("sequelize");
const appError_1 = require("../utils/appError");
const cacheManager_1 = require("../utils/helper/cacheManager");
const reportPlanningPaper_1 = require("../models/report/reportPlanningPaper");
const reportRepository_1 = require("../repository/reportRepository");
const reportHelper_1 = require("../utils/helper/modelHelper/reportHelper");
const reportPlanningBox_1 = require("../models/report/reportPlanningBox");
const excelExporter_1 = require("../utils/helper/excelExporter");
const reportPaperRowAndColumn_1 = require("../utils/mapping/reportPaperRowAndColumn");
const reportBoxRowAndColumn_1 = require("../utils/mapping/reportBoxRowAndColumn");
const redisCache_1 = __importDefault(require("../assest/configs/redisCache"));
const devEnvironment = process.env.NODE_ENV !== "production";
const { paper } = cacheManager_1.CacheManager.keys.report;
const { box } = cacheManager_1.CacheManager.keys.report;
exports.reportService = {
    //====================================PAPER========================================
    getReportPaper: async (machine, page, pageSize) => {
        try {
            const cacheKey = paper.all(machine, page);
            const { isChanged } = await cacheManager_1.CacheManager.check(reportPlanningPaper_1.ReportPlanningPaper, "reportPaper");
            if (isChanged) {
                await cacheManager_1.CacheManager.clearReportPaper();
            }
            else {
                const cachedData = await redisCache_1.default.get(cacheKey);
                if (cachedData) {
                    if (devEnvironment)
                        console.log("✅ Data Report Planning Paper from Redis");
                    const parsed = JSON.parse(cachedData);
                    return { ...parsed, message: "Get all report planning paper from cache" };
                }
            }
            const totalOrders = await reportRepository_1.reportRepository.reportCount(reportPlanningPaper_1.ReportPlanningPaper);
            const totalPages = Math.ceil(totalOrders / pageSize);
            const offset = (page - 1) * pageSize;
            const data = await reportRepository_1.reportRepository.findReportPaperByMachine(machine, pageSize, offset);
            const responseData = {
                message: "get all report planning paper successfully",
                data,
                totalOrders,
                totalPages,
                currentPage: page,
            };
            await redisCache_1.default.set(cacheKey, JSON.stringify(responseData), "EX", 3600);
            return responseData;
        }
        catch (error) {
            console.error("get all reportPaper failed:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    getReportPaperByField: async (field, keyword, machine, page, pageSize) => {
        try {
            const fieldMap = {
                customerName: (report) => report?.Planning?.Order?.Customer?.customerName,
                dayReported: (report) => report?.dayReport,
                shiftManagement: (report) => report?.shiftManagement,
                orderId: (report) => report?.Planning?.Order?.orderId,
            };
            const key = field;
            if (!fieldMap[key]) {
                throw appError_1.AppError.BadRequest("Missing required parameter", "MISSING_PARAMETERS");
            }
            const result = await (0, reportHelper_1.filterReportByField)({
                keyword: keyword,
                machine,
                getFieldValue: fieldMap[key],
                page,
                pageSize,
                message: `get all by ${field} from filtered cache`,
            });
            return result;
        }
        catch (error) {
            console.error(`Failed to get report paper by ${field}:`, error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    //====================================BOX========================================
    getReportBox: async (machine, page, pageSize) => {
        try {
            const cacheKey = box.all(machine, page);
            const { isChanged } = await cacheManager_1.CacheManager.check(reportPlanningBox_1.ReportPlanningBox, "reportBox");
            if (isChanged) {
                await cacheManager_1.CacheManager.clearReportBox();
            }
            else {
                const cachedData = await redisCache_1.default.get(cacheKey);
                if (cachedData) {
                    if (devEnvironment)
                        console.log("✅ Data Report Planning Box from Redis");
                    const parsed = JSON.parse(cachedData);
                    return { ...parsed, message: "Get all report planning box from cache" };
                }
            }
            const totalOrders = await reportRepository_1.reportRepository.reportCount(reportPlanningBox_1.ReportPlanningBox);
            const totalPages = Math.ceil(totalOrders / pageSize);
            const offset = (page - 1) * pageSize;
            const data = await reportRepository_1.reportRepository.findAlReportBox(machine, pageSize, offset);
            const responseData = {
                message: "get all report planning paper successfully",
                data,
                totalOrders,
                totalPages,
                currentPage: page,
            };
            await redisCache_1.default.set(cacheKey, JSON.stringify(responseData), "EX", 3600);
            return responseData;
        }
        catch (error) {
            console.error("get all reportBox failed:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    getReportBoxByField: async (field, keyword, machine, page, pageSize) => {
        try {
            const fieldMap = {
                customerName: (report) => report?.PlanningBox?.Order?.Customer?.customerName,
                dayReported: (report) => report?.dayReport,
                QcBox: (report) => report?.PlanningBox?.Order?.QC_box,
                shiftManagement: (report) => report?.shiftManagement,
                orderId: (report) => report?.PlanningBox?.Order?.orderId,
            };
            const key = field;
            if (!fieldMap[key]) {
                throw appError_1.AppError.BadRequest("Missing required parameter", "MISSING_PARAMETERS");
            }
            const result = await (0, reportHelper_1.filterReportByField)({
                keyword: keyword,
                machine,
                getFieldValue: fieldMap[key],
                page,
                pageSize,
                message: `get all by ${field} from filtered cache`,
                isBox: true,
            });
            return result;
        }
        catch (error) {
            console.error(`Failed to get report paper by ${field}:`, error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    //====================================EXPORT EXCEL========================================
    exportReportPaper: async (res, fromDate, toDate, reportPaperId, machine) => {
        try {
            let whereCondition = {};
            if (reportPaperId && reportPaperId.length > 0) {
                whereCondition.reportPaperId = reportPaperId;
            }
            else if (fromDate && toDate) {
                const start = new Date(fromDate);
                start.setHours(0, 0, 0, 0);
                const end = new Date(toDate);
                end.setHours(23, 59, 59, 999);
                whereCondition.dayReport = { [sequelize_1.Op.between]: [start, end] };
            }
            const data = await reportRepository_1.reportRepository.exportReportPaper(whereCondition, machine);
            await (0, excelExporter_1.exportExcelResponse)(res, {
                data: data,
                sheetName: "Báo cáo sản xuất giấy tấm",
                fileName: `report_paper_${machine}`,
                columns: reportPaperRowAndColumn_1.reportPaperColumns,
                rows: reportPaperRowAndColumn_1.mapReportPaperRow,
            });
        }
        catch (error) {
            console.error("Export Excel error:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    exportReportBox: async (res, fromDate, toDate, reportBoxId, machine) => {
        try {
            let whereCondition = {};
            if (reportBoxId && reportBoxId.length > 0) {
                whereCondition.reportBoxId = reportBoxId;
            }
            else if (fromDate && toDate) {
                const start = new Date(fromDate);
                start.setHours(0, 0, 0, 0);
                const end = new Date(toDate);
                end.setHours(23, 59, 59, 999);
                whereCondition.dayReport = { [sequelize_1.Op.between]: [start, end] };
            }
            const data = await reportRepository_1.reportRepository.exportReportBox(whereCondition, machine);
            await (0, excelExporter_1.exportExcelResponse)(res, {
                data: data,
                sheetName: "Báo cáo sản xuất thùng",
                fileName: `report_box_${machine}`,
                columns: reportBoxRowAndColumn_1.reportBoxColumns,
                rows: reportBoxRowAndColumn_1.mapReportBoxRow,
            });
        }
        catch (error) {
            console.error("Export Excel error:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
};
//# sourceMappingURL=reportService.js.map