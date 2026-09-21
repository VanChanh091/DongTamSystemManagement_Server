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
const cacheKey_1 = require("../utils/helper/cache/cacheKey");
const normalizeVN_1 = require("../utils/helper/normalizeVN");
const dayjs_config_1 = require("../assets/configs/dayjs/dayjs.config");
const redis_connect_1 = __importDefault(require("../assets/configs/connect/redis.connect"));
const cacheManager_1 = require("../utils/helper/cache/cacheManager");
const reportRepository_1 = require("../repository/reportRepository");
const reportPlanningBox_1 = require("../models/report/reportPlanningBox");
const excelExporter_1 = require("../utils/helper/excelExporter");
const reportPaperRowAndColumn_1 = require("../utils/mapping/report/reportPaperRowAndColumn");
const reportPlanningPaper_1 = require("../models/report/reportPlanningPaper");
const meilisearch_connect_1 = require("../assets/configs/connect/meilisearch.connect");
const reportBoxRowAndColumn_1 = require("../utils/mapping/report/reportBoxRowAndColumn");
const reportHelper_1 = require("../utils/helper/modelHelper/reportHelper");
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
            const queryOptions = reportRepository_1.reportRepository.buildReportPaperOptions({ machine, page, pageSize });
            const { rows, count } = await reportPlanningPaper_1.ReportPlanningPaper.findAndCountAll(queryOptions);
            const totalPages = Math.ceil(count / pageSize);
            if (rows.length === 0) {
                return {
                    message: "No data",
                    data: [],
                    totalPapers: count,
                    totalPages,
                    currentPage: page,
                    summaryByDate: {},
                };
            }
            const summaryByDate = await (0, reportHelper_1.getPerformanceSummaryByRows)(rows, machine);
            const responseData = {
                message: "get all report planning paper successfully",
                data: rows,
                totalPapers: count,
                totalPages,
                currentPage: page,
                summaryByDate,
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
    getReportPaperByField: async ({ field, keyword, machine, page, pageSize, startDate, endDate, }) => {
        try {
            const validFields = ["orderId", "customerName", "dayReported", "shiftManagement"];
            if (!validFields.includes(field)) {
                throw appError_1.AppError.BadRequest(`Field '${field}' is not supported for search`, "INVALID_FIELD");
            }
            const index = meilisearch_connect_1.meiliClient.index("reportPapers");
            // Lọc theo ngày nếu có
            let searchKeyword = keyword;
            let filters = [`chooseMachine = "${machine}"`];
            if (field === "dayReported") {
                searchKeyword = "";
                if (startDate && endDate) {
                    const startTimestamp = dayjs_config_1.dayjsUtc.utc(startDate).startOf("day").unix();
                    filters.push(`dayReported >= ${startTimestamp}`);
                    const endTimestamp = dayjs_config_1.dayjsUtc.utc(endDate).endOf("day").unix();
                    filters.push(`dayReported <= ${endTimestamp}`);
                }
            }
            const searchOptions = {
                filter: filters.join(" AND "),
                attributesToSearchOn: searchKeyword ? [field] : [],
                attributesToRetrieve: ["reportPaperId"],
                sort: ["dayReported:desc"],
                page: Number(page) || 1,
                hitsPerPage: Number(pageSize) || 25,
            };
            const searchResult = await index.search(searchKeyword, searchOptions);
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
            const queryOptions = reportRepository_1.reportRepository.buildReportPaperOptions({
                machine,
                whereCondition: {
                    reportPaperId: { [sequelize_1.Op.in]: paperIds },
                },
            });
            const result = await reportPlanningPaper_1.ReportPlanningPaper.findAll(queryOptions);
            // Sắp xếp lại thứ tự của SQL theo đúng thứ tự của Meilisearch
            const finalData = paperIds
                .map((id) => result.find((r) => r.reportPaperId === id))
                .filter(Boolean);
            const summaryByDate = (0, reportHelper_1.getPerformanceSearchSummary)(finalData);
            return {
                message: "Get orders from Meilisearch & DB successfully",
                data: finalData,
                totalPapers: searchResult.totalHits,
                totalPages: searchResult.totalPages,
                currentPage: page,
                summaryByDate,
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
            const queryOptions = reportRepository_1.reportRepository.buildReportBoxOptions({
                machine,
                page,
                pageSize,
                whereCondition: { machine },
            });
            const { rows, count } = await reportPlanningBox_1.ReportPlanningBox.findAndCountAll(queryOptions);
            const totalPages = Math.ceil(count / pageSize);
            const responseData = {
                message: "get all report planning box successfully",
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
    getReportBoxByField: async ({ field, keyword, machine, page, pageSize, startDate, endDate, }) => {
        try {
            const validFields = ["orderId", "customerName", "dayReported", "QC_box", "shiftManagement"];
            if (!validFields.includes(field)) {
                throw appError_1.AppError.BadRequest(`Field '${field}' is not supported for search`, "INVALID_FIELD");
            }
            const index = meilisearch_connect_1.meiliClient.index("reportBoxes");
            // Lọc theo ngày nếu có
            let searchKeyword = keyword;
            let filters = [`machine = "${machine}"`];
            if (field === "dayReported") {
                searchKeyword = "";
                if (startDate && endDate) {
                    const startTimestamp = dayjs_config_1.dayjsUtc.utc(startDate).startOf("day").unix();
                    filters.push(`dayReported >= ${startTimestamp}`);
                    const endTimestamp = dayjs_config_1.dayjsUtc.utc(endDate).endOf("day").unix();
                    filters.push(`dayReported <= ${endTimestamp}`);
                }
            }
            const searchOptions = {
                filter: filters.join(" AND "),
                attributesToSearchOn: searchKeyword ? [field] : [],
                attributesToRetrieve: ["reportBoxId"],
                sort: ["dayReported:desc"],
                page: Number(page) || 1,
                hitsPerPage: Number(pageSize) || 25,
            };
            const searchResult = await index.search(searchKeyword, searchOptions);
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
            const queryOptions = reportRepository_1.reportRepository.buildReportBoxOptions({
                machine,
                whereCondition: { machine, reportBoxId: { [sequelize_1.Op.in]: boxIds } },
            });
            const result = await reportPlanningBox_1.ReportPlanningBox.findAll(queryOptions);
            // Sắp xếp lại thứ tự của SQL theo đúng thứ tự của Meilisearch
            const finalData = boxIds
                .map((id) => result.find((r) => r.reportBoxId === id))
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
    exportReportPaper: async ({ res, fromDate, toDate, userName, machine, }) => {
        try {
            let whereCondition = {};
            if (fromDate && toDate) {
                const startTimestamp = (0, dayjs_config_1.dayjsUtc)(fromDate).toDate();
                const endTimestamp = (0, dayjs_config_1.dayjsUtc)(toDate).toDate();
                // console.log(`start: ${fromDate} - end: ${toDate}`);
                // console.log(`startTimestamp: ${startTimestamp} - endTimestamp: ${endTimestamp}`);
                whereCondition.dayReport = { [sequelize_1.Op.between]: [startTimestamp, endTimestamp] };
            }
            const baseQuery = reportRepository_1.reportRepository.buildReportPaperOptions({ machine, whereCondition });
            const safeMachineName = machine && machine.trim() !== ""
                ? (0, normalizeVN_1.normalizeVN)(machine.replace(/\s+/g, "-"))
                : "all_machines";
            await (0, excelExporter_1.exportExcelStreamResponse)(res, {
                baseQuery: baseQuery,
                model: reportPlanningPaper_1.ReportPlanningPaper,
                sheetName: "Báo cáo sản xuất giấy tấm",
                fileName: `report_paper_${safeMachineName}`,
                columns: reportPaperRowAndColumn_1.reportPaperColumns,
                rows: reportPaperRowAndColumn_1.mapReportPaperRow,
                userName: userName,
            });
        }
        catch (error) {
            console.error("Export Excel error:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    exportReportBox: async (res, fromDate, toDate, userName, machine) => {
        try {
            let whereCondition = { machine: machine };
            if (fromDate && toDate) {
                const startTimestamp = (0, dayjs_config_1.dayjsUtc)(fromDate).startOf("day").toDate();
                const endTimestamp = (0, dayjs_config_1.dayjsUtc)(toDate).endOf("day").toDate();
                // console.log(`start: ${fromDate} - end: ${toDate}`);
                // console.log(`startTimestamp: ${startTimestamp} - endTimestamp: ${endTimestamp}`);
                whereCondition.dayReport = { [sequelize_1.Op.between]: [startTimestamp, endTimestamp] };
            }
            const baseQuery = reportRepository_1.reportRepository.buildReportBoxOptions({ machine, whereCondition });
            const safeMachineName = machine && machine.trim() !== ""
                ? (0, normalizeVN_1.normalizeVN)(machine.replace(/\s+/g, "-"))
                : "all_machines";
            await (0, excelExporter_1.exportExcelStreamResponse)(res, {
                baseQuery: baseQuery,
                model: reportPlanningBox_1.ReportPlanningBox,
                sheetName: "Báo cáo sản xuất thùng",
                fileName: `report_box_${safeMachineName}`,
                columns: reportBoxRowAndColumn_1.reportBoxColumns,
                rows: reportBoxRowAndColumn_1.mapReportBoxRow,
                userName: userName,
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