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
const cacheManager_1 = require("../utils/helper/cache/cacheManager");
const reportPlanningPaper_1 = require("../models/report/reportPlanningPaper");
const reportRepository_1 = require("../repository/reportRepository");
const reportPlanningBox_1 = require("../models/report/reportPlanningBox");
const excelExporter_1 = require("../utils/helper/excelExporter");
const reportPaperRowAndColumn_1 = require("../utils/mapping/reportPaperRowAndColumn");
const reportBoxRowAndColumn_1 = require("../utils/mapping/reportBoxRowAndColumn");
const redis_connect_1 = __importDefault(require("../assest/configs/connect/redis.connect"));
const cacheKey_1 = require("../utils/helper/cache/cacheKey");
const normalizeVN_1 = require("../utils/helper/normalizeVN");
const meilisearch_connect_1 = require("../assest/configs/connect/meilisearch.connect");
const devEnvironment = process.env.NODE_ENV !== "production";
const { paper, box } = cacheKey_1.CacheKey.report;
exports.reportService = {
    //====================================PAPER========================================
    getReportPaper: async (machine, page, pageSize) => {
        try {
            const cacheKey = paper.all(machine, page);
            const { isChanged } = await cacheManager_1.CacheManager.check(reportPlanningPaper_1.ReportPlanningPaper, "reportPaper");
            if (isChanged) {
                await cacheManager_1.CacheManager.clear("reportPaper");
            }
            else {
                const cachedData = await redis_connect_1.default.get(cacheKey);
                if (cachedData) {
                    if (devEnvironment)
                        console.log("✅ Data Report Planning Paper from Redis");
                    const parsed = JSON.parse(cachedData);
                    return { ...parsed, message: "Get all report planning paper from cache" };
                }
            }
            const offset = (page - 1) * pageSize;
            const { rows, count } = await reportRepository_1.reportRepository.findReportPaperByMachine(machine, pageSize, offset);
            const totalPages = Math.ceil(count / pageSize);
            const responseData = {
                message: "get all report planning paper successfully",
                data: rows,
                totalPapers: count,
                totalPages,
                currentPage: page,
            };
            await redis_connect_1.default.set(cacheKey, JSON.stringify(responseData), "EX", 3600);
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
            const validFields = ["orderId", "customerName", "dayReported", "shiftManagement"];
            if (!validFields.includes(field)) {
                throw appError_1.AppError.BadRequest(`Field '${field}' is not supported for search`, "INVALID_FIELD");
            }
            const index = meilisearch_connect_1.meiliClient.index("reportPapers");
            const searchResult = await index.search(keyword, {
                attributesToSearchOn: [field],
                attributesToRetrieve: ["reportPaperId"], // Chỉ lấy reportPaperId
                filter: `chooseMachine = "${machine}"`,
                page: Number(page) || 1,
                hitsPerPage: Number(pageSize) || 25,
            });
            const paperIds = searchResult.hits.map((hit) => hit.reportPaperId);
            if (paperIds.length === 0) {
                return {
                    message: "No report papers found",
                    data: [],
                    totalPapers: 0,
                    totalPages: 1,
                    currentPage: page,
                };
            }
            // Truy vấn DB để lấy data dựa trên orderIds
            const fullOrders = (await reportRepository_1.reportRepository.getDataReportPaperOrBox({
                isBox: false,
                machine,
                whereCondition: {
                    reportPaperId: { [sequelize_1.Op.in]: paperIds },
                },
            }));
            // Sắp xếp lại thứ tự của SQL theo đúng thứ tự của Meilisearch
            const finalData = paperIds
                .map((id) => fullOrders.find((r) => r.reportPaperId === id))
                .filter(Boolean);
            return {
                message: "Get orders from Meilisearch & DB successfully",
                data: finalData,
                totalPapers: searchResult.totalHits,
                totalPages: searchResult.totalPages,
                currentPage: page,
            };
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
                await cacheManager_1.CacheManager.clear("reportBox");
            }
            else {
                const cachedData = await redis_connect_1.default.get(cacheKey);
                if (cachedData) {
                    if (devEnvironment)
                        console.log("✅ Data Report Planning Box from Redis");
                    const parsed = JSON.parse(cachedData);
                    return { ...parsed, message: "Get all report planning box from cache" };
                }
            }
            const offset = (page - 1) * pageSize;
            const { rows, count } = await reportRepository_1.reportRepository.findAllReportBox(machine, pageSize, offset);
            const totalPages = Math.ceil(count / pageSize);
            const responseData = {
                message: "get all report planning paper successfully",
                data: rows,
                totalBoxes: count,
                totalPages,
                currentPage: page,
            };
            await redis_connect_1.default.set(cacheKey, JSON.stringify(responseData), "EX", 3600);
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
            const validFields = ["orderId", "customerName", "dayReported", "QC_box", "shiftManagement"];
            if (!validFields.includes(field)) {
                throw appError_1.AppError.BadRequest(`Field '${field}' is not supported for search`, "INVALID_FIELD");
            }
            const index = meilisearch_connect_1.meiliClient.index("reportBoxes");
            const searchResult = await index.search(keyword, {
                attributesToSearchOn: [field],
                attributesToRetrieve: ["reportBoxId"], // Chỉ lấy reportBoxId
                filter: `machine = "${machine}"`,
                page: Number(page) || 1,
                hitsPerPage: Number(pageSize) || 25,
            });
            const boxIds = searchResult.hits.map((hit) => hit.reportBoxId);
            if (boxIds.length === 0) {
                return {
                    message: "No report boxes found",
                    data: [],
                    totalBoxes: 0,
                    totalPages: 1,
                    currentPage: page,
                };
            }
            // Truy vấn DB để lấy data dựa trên orderIds
            const fullOrders = (await reportRepository_1.reportRepository.getDataReportPaperOrBox({
                isBox: true,
                machine,
                whereCondition: {
                    reportBoxId: { [sequelize_1.Op.in]: boxIds },
                },
            }));
            // Sắp xếp lại thứ tự của SQL theo đúng thứ tự của Meilisearch
            const finalData = boxIds
                .map((id) => fullOrders.find((r) => r.reportBoxId === id))
                .filter(Boolean);
            return {
                message: "Get orders from Meilisearch & DB successfully",
                data: finalData,
                totalBoxes: searchResult.totalHits,
                totalPages: searchResult.totalPages,
                currentPage: page,
            };
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
            const safeMachineName = machine.replace(/\s+/g, "-");
            await (0, excelExporter_1.exportExcelResponse)(res, {
                data: data,
                sheetName: "Báo cáo sản xuất giấy tấm",
                fileName: `bao-cao-${(0, normalizeVN_1.normalizeVN)(safeMachineName)}`,
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
            let whereCondition = { machine: machine };
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
            const safeMachineName = machine.replace(/\s+/g, "-");
            await (0, excelExporter_1.exportExcelResponse)(res, {
                data: data,
                sheetName: "Báo cáo sản xuất thùng",
                fileName: `bao-cao-${(0, normalizeVN_1.normalizeVN)(safeMachineName)}`,
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