"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardService = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const redis_connect_1 = __importDefault(require("../assest/configs/connect/redis.connect"));
const sequelize_1 = require("sequelize");
const cacheKey_1 = require("../utils/helper/cache/cacheKey");
const dashboardRepository_1 = require("../repository/dashboardRepository");
const appError_1 = require("../utils/appError");
const cacheManager_1 = require("../utils/helper/cache/cacheManager");
const planningPaper_1 = require("../models/planning/planningPaper");
const dbPlanningRowAndColumn_1 = require("../utils/mapping/dbPlanningRowAndColumn");
const excelExporter_1 = require("../utils/helper/excelExporter");
const planningBoxMachineTime_1 = require("../models/planning/planningBoxMachineTime");
const planningHelper_1 = require("../utils/helper/modelHelper/planningHelper");
const meilisearch_connect_1 = require("../assest/configs/connect/meilisearch.connect");
const devEnvironment = process.env.NODE_ENV !== "production";
const { planning, details } = cacheKey_1.CacheKey.dashboard;
exports.dashboardService = {
    getAllDashboardPlanning: async (page, pageSize, status) => {
        const cacheKey = planning.all(status, page);
        try {
            const { isChanged } = await cacheManager_1.CacheManager.check(planningPaper_1.PlanningPaper, "dbPlanning");
            if (isChanged) {
                await cacheManager_1.CacheManager.clear("dbPlanning");
            }
            else {
                const cachedData = await redis_connect_1.default.get(cacheKey);
                if (cachedData) {
                    if (devEnvironment)
                        console.log("✅ Get PlanningPaper from cache");
                    const parsed = JSON.parse(cachedData);
                    return { ...parsed, message: "Get PlanningPaper from cache" };
                }
            }
            const { rows, count } = await dashboardRepository_1.dashboardRepository.getAllDbPlanning({
                page,
                pageSize,
                whereCondition: { status },
            });
            const totalPages = Math.ceil(count / pageSize);
            const responseData = {
                message: "get all data paper from db",
                data: rows,
                totalPlannings: count,
                totalPages,
                currentPage: page,
            };
            await redis_connect_1.default.set(cacheKey, JSON.stringify(responseData), "EX", 1800);
            return responseData;
        }
        catch (error) {
            console.error("Error get db planning:", error);
            throw appError_1.AppError.ServerError();
        }
    },
    getDbPlanningDetail: async (planningId) => {
        const cacheKey = details.all(planningId);
        try {
            const { isChanged } = await cacheManager_1.CacheManager.check(planningBoxMachineTime_1.PlanningBoxTime, "dbDetail");
            if (isChanged) {
                await cacheManager_1.CacheManager.clear("dbPlanningDetail");
            }
            else {
                const cachedData = await redis_connect_1.default.get(cacheKey);
                if (cachedData) {
                    if (devEnvironment)
                        console.log("📦 Get Planning STAGES from cache");
                    const parsed = JSON.parse(cachedData);
                    return { message: "Get PlanningPaper from cache", data: parsed };
                }
            }
            //get data detail
            const detail = await dashboardRepository_1.dashboardRepository.getDBPlanningDetail(planningId);
            if (!detail) {
                throw appError_1.AppError.NotFound("detail not found", "DETAIL_NOT_FOUND");
            }
            const box = detail.PlanningBox;
            if (!box)
                return { message: "Planning is not box type", data: [] };
            const stages = await (0, planningHelper_1.buildStagesDetails)({
                detail: box,
                getBoxTimes: (d) => d.boxTimes,
                getPlanningBoxId: (d) => d.planningBoxId,
                getAllOverflow: (id) => dashboardRepository_1.dashboardRepository.getAllTimeOverflow(id),
            });
            await redis_connect_1.default.set(cacheKey, JSON.stringify(stages), "EX", 1800);
            return { message: "get db planning detail succesfully", data: stages };
        }
        catch (error) {
            console.error("Error get db planning detail:", error);
            throw appError_1.AppError.ServerError();
        }
    },
    //get by field
    getDbPlanningByFields: async ({ field, keyword, page, pageSize }) => {
        try {
            const validFields = ["orderId", "machine", "customerName", "companyName", "username"];
            if (!validFields.includes(field)) {
                throw appError_1.AppError.BadRequest(`Field '${field}' is not supported for search`, "INVALID_FIELD");
            }
            const index = meilisearch_connect_1.meiliClient.index("dashboard");
            // Tìm kiếm trên Meilisearch để lấy planningId
            const searchResult = await index.search(keyword, {
                attributesToSearchOn: [field],
                attributesToRetrieve: ["planningId"], // Chỉ lấy planningId
                page: Number(page) || 1,
                hitsPerPage: Number(pageSize) || 25,
            });
            const planningIdsArr = searchResult.hits.map((p) => p.planningId);
            if (planningIdsArr.length === 0) {
                return {
                    message: "No dashboard found",
                    data: [],
                    totalPlannings: 0,
                    totalPages: 1,
                    currentPage: page,
                };
            }
            //query db
            const { rows } = await dashboardRepository_1.dashboardRepository.getAllDbPlanning({
                whereCondition: {
                    planningId: { [sequelize_1.Op.in]: planningIdsArr },
                },
                paginate: false,
            });
            // Sắp xếp lại thứ tự của SQL theo đúng thứ tự của Meilisearch
            const finalData = planningIdsArr
                .map((id) => rows.find((planning) => planning.planningId === id))
                .filter(Boolean);
            return {
                message: "Get dashboard from Meilisearch & DB successfully",
                data: finalData,
                totalPlannings: searchResult.totalHits,
                totalPages: searchResult.totalPages,
                currentPage: page,
            };
        }
        catch (error) {
            console.error(`Failed to get dashboard by ${field}`, error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    //export planning stage
    getAllDbPlanningStage: async () => {
        try {
            const rawPapers = await dashboardRepository_1.dashboardRepository.exportExcelDbPlanning({});
            // Format dữ liệu thành 2 tầng cho FE
            const formatted = await Promise.all(rawPapers.map(async (paper) => {
                const box = paper.PlanningBox;
                // ===== Stages (7 công đoạn) =====
                const normalStages = box?.boxTimes?.map((stage) => stage.toJSON()) ?? [];
                const allOverflow = await dashboardRepository_1.dashboardRepository.getAllTimeOverflow(box?.planningBoxId ?? 0);
                const overflowByMachine = {};
                for (const ov of allOverflow) {
                    overflowByMachine[ov.machine] = ov;
                }
                // ===== Gắn overflow vào từng stage =====
                const stages = normalStages.map((stage) => ({
                    ...stage,
                    timeOverFlow: overflowByMachine[String(stage.machine)] ?? null,
                }));
                // ===== Remove nested (giữ sạch dữ liệu) =====
                const paperJson = paper.toJSON();
                delete paperJson.PlanningBox;
                delete paperJson.Order?.box;
                return { ...paperJson, stages };
            }));
            return formatted;
        }
        catch (error) {
            console.error("❌ Export Excel error:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    //export excel
    exportExcelDbPlanning: async (req, res) => {
        const { username, dayStart, machine, all = false } = req.body;
        try {
            let whereCondition = {};
            if (all === "true") {
                // xuất toàn bộ
            }
            else if (username) {
                whereCondition["$Order.User.fullName$"] = {
                    [sequelize_1.Op.like]: `%${username}%`,
                };
            }
            else if (machine) {
                whereCondition["chooseMachine"] = {
                    [sequelize_1.Op.like]: `%${machine}%`,
                };
            }
            else if (dayStart) {
                const start = new Date(dayStart);
                start.setHours(0, 0, 0, 0);
                const end = new Date(dayStart);
                end.setHours(23, 59, 59, 999);
                whereCondition.dayStart = { [sequelize_1.Op.between]: [start, end] };
            }
            const rawPapers = await dashboardRepository_1.dashboardRepository.exportExcelDbPlanning({ whereCondition });
            // Format dữ liệu thành 2 tầng
            const formatted = await Promise.all(rawPapers.map(async (paper) => {
                const box = paper.PlanningBox;
                // ===== Stages (7 công đoạn) =====
                const normalStages = box?.boxTimes?.map((stage) => stage.toJSON()) ?? [];
                const allOverflow = await dashboardRepository_1.dashboardRepository.getAllTimeOverflow(box?.planningBoxId ?? 0);
                const overflowByMachine = {};
                for (const ov of allOverflow) {
                    overflowByMachine[ov.machine] = ov;
                }
                // ===== Gắn overflow vào từng stage =====
                const stages = normalStages.map((stage) => ({
                    ...stage,
                    timeOverFlow: overflowByMachine[String(stage.machine)] ?? null,
                }));
                // ===== Remove nested (giữ sạch dữ liệu) =====
                const paperJson = paper.toJSON();
                delete paperJson.PlanningBox;
                delete paperJson.Order?.box;
                return { ...paperJson, stages };
            }));
            await (0, excelExporter_1.exportExcelDbPlanning)(res, {
                data: formatted,
                sheetName: "Tổng Hợp Sản Xuất",
                fileName: "dbPlanning",
                columns: dbPlanningRowAndColumn_1.dbPlanningColumns,
                rows: dbPlanningRowAndColumn_1.mappingDbPlanningRow,
            });
        }
        catch (error) {
            console.error("❌ Export Excel error:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
};
//# sourceMappingURL=dashboardService.js.map