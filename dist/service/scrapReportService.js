"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapReportService = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const sequelize_1 = require("sequelize");
const appError_1 = require("../utils/appError");
const meiliService_1 = require("./system/meiliService");
const labelFields_1 = require("../assets/labelFields");
const scrapReport_1 = require("../models/scrap/scrapReport");
const dayjs_config_1 = require("../assets/configs/dayjs/dayjs.config");
const reportRepository_1 = require("../repository/reportRepository");
const transactionHelper_1 = require("../utils/helper/transactionHelper");
const manufactureRepository_1 = require("../repository/manufactureRepository");
const meilisearch_connect_1 = require("../assets/configs/connect/meilisearch.connect");
const scrapReportRepository_1 = require("../repository/scrapReportRepository");
const meiliTransformer_1 = require("../assets/configs/meilisearch/meiliTransformer");
const cacheManager_1 = require("../utils/helper/cache/cacheManager");
const redis_connect_1 = __importDefault(require("../assets/configs/connect/redis.connect"));
const cacheKey_1 = require("../utils/helper/cache/cacheKey");
const devEnvironment = process.env.NODE_ENV !== "production";
const { scrap } = cacheKey_1.CacheKey.report;
exports.scrapReportService = {
    getScrapReportWaitingCheck: async () => {
        try {
            const options = scrapReportRepository_1.scrapReportRepository.buildScrapReportOptions({
                whereCondition: { status: { [sequelize_1.Op.in]: ["pending", "rejected"] } },
                optionsField: {
                    order: [
                        ["status", "DESC"],
                        ["scrapId", "DESC"],
                    ],
                },
            });
            const data = await scrapReport_1.ScrapReport.findAll(options);
            return { message: "Get scrap reports waiting check successfully", data };
        }
        catch (error) {
            console.error("❌ get scrap reports waiting check failed:", error);
            throw appError_1.AppError.ServerError();
        }
    },
    getScrapReportByStatus: async ({ page, pageSize, status, machine, }) => {
        try {
            const cacheKey = scrap.all(machine, status, page);
            const { isChanged } = await cacheManager_1.CacheManager.check([{ model: scrapReport_1.ScrapReport }], "reportScrap");
            if (isChanged) {
                await cacheManager_1.CacheManager.clear("reportScrap");
            }
            else {
                const cachedData = await redis_connect_1.default.get(cacheKey);
                if (cachedData) {
                    if (devEnvironment)
                        console.log("✅ Data Scrap Reports from Redis");
                    const parsed = JSON.parse(cachedData);
                    return { ...parsed, message: `Get all scrap reports from cache` };
                }
            }
            const options = scrapReportRepository_1.scrapReportRepository.buildScrapReportOptions({
                page,
                pageSize,
                whereCondition: { machine, status },
            });
            const { rows, count } = await scrapReport_1.ScrapReport.findAndCountAll(options);
            const responseData = {
                message: "Get all scrap reports successfully",
                data: rows,
                totalScrapReports: count,
                totalPages: Math.ceil(count / pageSize),
                currentPage: page,
            };
            // await redisCache.set(cacheKey, JSON.stringify(responseData), "EX", 3600);
            return responseData;
        }
        catch (error) {
            console.error("❌ get scrap reports by status failed:", error);
            throw appError_1.AppError.ServerError();
        }
    },
    getScrapReportByField: async ({ page, pageSize, field, keyword, startDate, endDate, status, machine, }) => {
        try {
            const validFields = ["reportedBy", "reportedAt"];
            if (!validFields.includes(field)) {
                throw appError_1.AppError.BadRequest(`Field '${field}' is not supported for search`, "INVALID_FIELD");
            }
            const index = meilisearch_connect_1.meiliClient.index("scrapReports");
            let searchKeyword = keyword;
            let filter = [];
            if (field === "reportedAt") {
                searchKeyword = "";
                if (startDate && endDate) {
                    const startTimestamp = dayjs_config_1.dayjsUtc.utc(startDate).startOf("day").unix();
                    filter.push(`reportedAt >= ${startTimestamp}`);
                    const endTimestamp = dayjs_config_1.dayjsUtc.utc(endDate).endOf("day").unix();
                    filter.push(`reportedAt <= ${endTimestamp}`);
                }
                // console.log(`start: ${startDate} - end: ${endDate}`);
                // console.log(`filter: ${filter.join(" AND ")}`);
            }
            const searchOptions = {
                filter: filter.join(" AND "),
                attributesToSearchOn: searchKeyword ? [field] : [],
                attributesToRetrieve: ["scrapId"],
                sort: ["reportedAt:desc"],
                page: Number(page) || 1,
                hitsPerPage: Number(pageSize) || 25, //pageSize
            };
            const searchResult = await index.search(searchKeyword, searchOptions);
            const scrapIds = searchResult.hits.map((hit) => hit.scrapId);
            if (scrapIds.length === 0) {
                return {
                    message: "No scrap reports found",
                    data: [],
                    totalScrapReports: 0,
                    totalPages: 0,
                    currentPage: page,
                };
            }
            //query db
            const options = scrapReportRepository_1.scrapReportRepository.buildScrapReportOptions({
                whereCondition: { scrapId: { [sequelize_1.Op.in]: scrapIds } },
            });
            const { rows } = await scrapReport_1.ScrapReport.findAndCountAll(options);
            // Sắp xếp lại thứ tự của SQL theo đúng thứ tự của Meilisearch
            const finalData = scrapIds
                .map((id) => rows.find((scrap) => scrap.scrapId === id))
                .filter(Boolean);
            return {
                message: "Get scrap reports from Meilisearch & DB successfully",
                data: finalData,
                totalScrapReports: searchResult.totalHits,
                totalPages: searchResult.totalPages,
                currentPage: searchResult.page,
            };
        }
        catch (error) {
            console.error("❌ get scrap reports by field failed:", error);
            throw appError_1.AppError.ServerError();
        }
    },
    createScrapReport: async ({ scrapData, wasteNormField, }) => {
        const { qtyProduction = 0, qtyForklift = 0, qtyInventory = 0, qtyCoreTube = 0, qtyOther = 0, } = scrapData;
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                if (!wasteNormField.shiftProduction || !wasteNormField.machine) {
                    throw appError_1.AppError.BadRequest("Missing required parameters", "MISSING_PARAMETERS");
                }
                const totalQtyScrap = qtyProduction + qtyForklift + qtyInventory + qtyCoreTube + qtyOther;
                const response = await scrapReport_1.ScrapReport.create({
                    totalQtyScrap,
                    reportedAt: new Date(),
                    dayCompleted: wasteNormField.dayCompleted,
                    reportedBy: wasteNormField.shiftManagement,
                    machine: wasteNormField.machine,
                    shiftProduction: wasteNormField.shiftProduction,
                    ...scrapData,
                }, { transaction });
                //--------------------MEILISEARCH-----------------------
                const newScrap = await scrapReportRepository_1.scrapReportRepository.syncScrapReportToMeili({
                    scrapId: response.scrapId,
                    transaction,
                });
                if (newScrap) {
                    const flattenScrapReport = meiliTransformer_1.meiliTransformer.scrapReport(newScrap);
                    await meiliService_1.meiliService.syncOrUpdateMeiliData({
                        indexKey: labelFields_1.MEILI_INDEX.SCRAP_REPORTS,
                        data: flattenScrapReport,
                        transaction,
                    });
                }
                return { message: "Scrap report created successfully", data: response };
            });
        }
        catch (error) {
            console.error("Error create scrap report:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    updateScrapReport: async ({ scrapId, updateData, wasteNormField, }) => {
        const { qtyProduction = 0, qtyForklift = 0, qtyInventory = 0, qtyCoreTube = 0, qtyOther = 0, } = updateData;
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                if (!wasteNormField.shiftProduction || !wasteNormField.machine) {
                    throw appError_1.AppError.BadRequest("Missing required parameters", "MISSING_PARAMETERS");
                }
                const scrapReport = await scrapReport_1.ScrapReport.findByPk(scrapId, { transaction });
                if (!scrapReport) {
                    throw appError_1.AppError.BadRequest("Scrap report not found", "SCRAP_REPORT_NOT_FOUND");
                }
                const totalQtyScrap = qtyProduction + qtyForklift + qtyInventory + qtyCoreTube + qtyOther;
                const response = await scrapReport.update({
                    totalQtyScrap,
                    machine: wasteNormField.machine,
                    reportedBy: wasteNormField.shiftManagement,
                    dayCompleted: wasteNormField.dayCompleted,
                    shiftProduction: wasteNormField.shiftProduction,
                    rejectReason: "",
                    status: "pending",
                    ...updateData,
                }, { transaction });
                //--------------------MEILISEARCH-----------------------
                const scrapUpdated = await scrapReportRepository_1.scrapReportRepository.syncScrapReportToMeili({
                    scrapId: response.scrapId,
                    transaction,
                });
                if (scrapUpdated) {
                    const flattenScrapReport = meiliTransformer_1.meiliTransformer.scrapReport(scrapUpdated);
                    await meiliService_1.meiliService.syncOrUpdateMeiliData({
                        indexKey: labelFields_1.MEILI_INDEX.SCRAP_REPORTS,
                        data: flattenScrapReport,
                        isUpdate: true,
                        transaction,
                    });
                }
                return { message: "Scrap report updated successfully", data: response };
            });
        }
        catch (error) {
            console.error("Error update scrap report:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    confirmOrRejectScrapReport: async ({ scrapId, status, rejectReason, }) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const scrapReports = await scrapReport_1.ScrapReport.findAll({
                    where: { scrapId: { [sequelize_1.Op.in]: scrapId } },
                    attributes: { exclude: ["createdAt", "updatedAt"] },
                    transaction,
                });
                if (scrapReports.length === 0) {
                    throw appError_1.AppError.BadRequest("Scrap reports not found", "SCRAP_REPORTS_NOT_FOUND");
                }
                const isAllPending = scrapReports.every((r) => r.status === "pending");
                if (!isAllPending) {
                    throw appError_1.AppError.BadRequest(`Chỉ có thể ${status == "confirmed" ? "xác nhận" : "từ chối"} báo cáo đang chờ kiểm tra`, "INVALID_SCRAP_REPORT_STATUS");
                }
                await scrapReport_1.ScrapReport.update({ status: status, rejectReason: rejectReason }, { where: { scrapId: { [sequelize_1.Op.in]: scrapId } }, transaction });
                //--------------------MEILISEARCH-----------------------
                await exports.scrapReportService.syncMeiliUpdateStatusScrapReport(scrapId, transaction);
                return { message: `Scrap reports ${status} successfully` };
            });
        }
        catch (error) {
            console.error(`❌ ${status} scrap report failed:`, error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    allocateScrapReport: async ({ scrapId, machine, dayCompleted, shiftProduction, }) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const scrapReports = await scrapReport_1.ScrapReport.findAll({
                    where: { scrapId: { [sequelize_1.Op.in]: scrapId } },
                    attributes: { exclude: ["createdAt", "updatedAt"] },
                    transaction,
                });
                if (scrapReports.length === 0) {
                    throw appError_1.AppError.BadRequest("Scrap reports not found", "SCRAP_REPORTS_NOT_FOUND");
                }
                const isAllConfirmed = scrapReports.every((r) => r.status === "confirmed");
                if (!isAllConfirmed) {
                    throw appError_1.AppError.BadRequest("Chỉ có thể phân bổ báo cáo đã được xác nhận", "INVALID_SCRAP_REPORT_STATUS");
                }
                const startDate = dayjs_config_1.dayjsUtc.utc(dayCompleted).format("YYYY-MM-DD 00:00:00");
                const endDate = dayjs_config_1.dayjsUtc.utc(dayCompleted).format("YYYY-MM-DD 23:59:59");
                const missingScrap = await scrapReport_1.ScrapReport.findOne({
                    where: {
                        machine,
                        dayCompleted: { [sequelize_1.Op.between]: [startDate, endDate] },
                        shiftProduction,
                        status: "confirmed",
                        scrapId: { [sequelize_1.Op.notIn]: scrapId },
                    },
                    transaction,
                });
                if (missingScrap) {
                    throw appError_1.AppError.BadRequest("Có báo cáo phế liệu cùng ca chưa được chọn. Vui lòng chọn đầy đủ để phân bổ!", "MISSING_SCRAP_REPORTS_IN_BATCH");
                }
                const totalQtyScrap = scrapReports.reduce((sum, r) => sum + Number(r.qtyProduction || 0), 0);
                await exports.scrapReportService.reportWasteNormPaper({
                    machine,
                    dayCompleted,
                    shiftProduction,
                    qtyWasteNorm: totalQtyScrap,
                    transaction,
                });
                await scrapReport_1.ScrapReport.update({ status: "allocated" }, { where: { scrapId: { [sequelize_1.Op.in]: scrapId } }, transaction });
                //--------------------MEILISEARCH-----------------------
                await exports.scrapReportService.syncMeiliUpdateStatusScrapReport(scrapId, transaction);
                return { message: `Scrap reports allocated successfully` };
            });
        }
        catch (error) {
            console.error("❌ allocate scrap report failed:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    //helper to report waste norm paper
    reportWasteNormPaper: async ({ machine, dayCompleted, shiftProduction, qtyWasteNorm, transaction, }) => {
        try {
            const plannings = await manufactureRepository_1.manufactureRepo.getPlanningByDateAndShift({
                machine,
                dayCompleted,
                shiftProduction,
                transaction,
            });
            if (plannings.length === 0) {
                throw appError_1.AppError.NotFound("Không tìm thấy kế hoạch sản xuất cho ca này. Vui lòng kiểm tra lại!", "REPORTS_NOT_FOUND");
            }
            const planningIds = plannings.map((p) => p.planningId);
            const allReports = await reportRepository_1.reportRepository.getReportPaperByIds(planningIds, transaction);
            // Nhóm các report theo planningId
            const reportsGroupedByPlanning = new Map();
            allReports.forEach((r) => {
                if (!reportsGroupedByPlanning.has(r.planningId)) {
                    reportsGroupedByPlanning.set(r.planningId, []);
                }
                reportsGroupedByPlanning.get(r.planningId).push(r);
            });
            reportsGroupedByPlanning.forEach((reportList) => {
                reportList.sort((a, b) => b.reportPaperId - a.reportPaperId);
            });
            let remainingWaste = Math.round(Number(qtyWasteNorm) * 100) / 100;
            const totalItems = plannings.length;
            const dbUpdatePromises = [];
            // phân bổ phế liệu
            for (let i = 0; i < totalItems; i++) {
                const planning = plannings[i];
                const pId = planning.planningId;
                // Tìm các Report của planning này
                const planningReports = reportsGroupedByPlanning.get(pId) || [];
                const latestReport = planningReports[0];
                // Tính tổng số phế liệu ĐÃ ĐƯỢC PHÂN BỔ ở các ca trước (loại trừ report hiện tại)
                const alreadyAllocated = planningReports
                    .filter((r) => r.reportPaperId !== latestReport?.reportPaperId)
                    .reduce((sum, r) => sum + Number(r.qtyWasteNorm || 0), 0);
                // Tính định mức còn lại có thể phân bổ (Ví dụ: 30 - 19 = 11)
                const norm = Number(planning.totalLoss || 0);
                const availableNorm = Math.max(0, norm - alreadyAllocated);
                let allocatedWaste = 0;
                i === totalItems - 1
                    ? (allocatedWaste = remainingWaste) // nếu là đơn cuối thì ôm toàn bộ số lượng phế liệu
                    : (allocatedWaste = Math.round(Math.min(remainingWaste, availableNorm) * 100) / 100);
                remainingWaste = Math.round((remainingWaste - allocatedWaste) * 100) / 100;
                if (remainingWaste < 0)
                    remainingWaste = 0;
                // Nếu tìm thấy report của ca này, cập nhật số lượng phế liệu đã phân bổ vào report
                if (latestReport) {
                    latestReport.qtyWasteNorm = allocatedWaste;
                    dbUpdatePromises.push(latestReport.save({ transaction }));
                }
                // Tính tổng phế liệu tích lũy của công đoạn này
                const totalQtyWaste = Math.round(planningReports.reduce((sum, r) => sum + Number(r.qtyWasteNorm || 0), 0) * 100) / 100;
                dbUpdatePromises.push(planning.update({ qtyWasteNorm: totalQtyWaste }, { transaction }));
            }
            if (dbUpdatePromises.length > 0) {
                await Promise.all(dbUpdatePromises);
            }
        }
        catch (error) {
            console.error("Error add Report waste norm paper:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    //sync meili update status scrap report
    syncMeiliUpdateStatusScrapReport: async (scrapIds, transaction) => {
        try {
            const scrapUpdated = await scrapReportRepository_1.scrapReportRepository.syncAllScrapReportForMeili({
                whereCondition: { scrapId: { [sequelize_1.Op.in]: scrapIds } },
                transaction,
            });
            if (scrapUpdated) {
                const flattenScrapReport = scrapUpdated.map(meiliTransformer_1.meiliTransformer.scrapReport);
                await meiliService_1.meiliService.syncOrUpdateMeiliData({
                    indexKey: labelFields_1.MEILI_INDEX.SCRAP_REPORTS,
                    data: flattenScrapReport,
                    isUpdate: true,
                    transaction,
                });
            }
        }
        catch (error) {
            console.error("Error syncing Meili update status scrap report:", error);
            throw appError_1.AppError.ServerError();
        }
    },
    deleteScrapReport: async ({ scrapId }) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const scrapReport = await scrapReport_1.ScrapReport.findByPk(scrapId, { transaction });
                if (!scrapReport) {
                    throw appError_1.AppError.BadRequest("Scrap report not found", "SCRAP_REPORT_NOT_FOUND");
                }
                await scrapReport.destroy({ transaction });
                return { message: "Scrap report deleted successfully" };
            });
        }
        catch (error) {
            console.error("Error delete scrap report:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    exportExcelScrapReports: async (res, { fromDate, toDate }, userName) => { },
};
//# sourceMappingURL=scrapReportService.js.map