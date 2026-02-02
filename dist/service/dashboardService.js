"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardService = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const redisCache_1 = __importDefault(require("../assest/configs/redisCache"));
const dashboardRepository_1 = require("../repository/dashboardRepository");
const appError_1 = require("../utils/appError");
const cacheManager_1 = require("../utils/helper/cacheManager");
const planningPaper_1 = require("../models/planning/planningPaper");
const sequelize_1 = require("sequelize");
const dbPlanningRowAndColumn_1 = require("../utils/mapping/dbPlanningRowAndColumn");
const excelExporter_1 = require("../utils/helper/excelExporter");
const planningBoxMachineTime_1 = require("../models/planning/planningBoxMachineTime");
const planningHelper_1 = require("../utils/helper/modelHelper/planningHelper");
const devEnvironment = process.env.NODE_ENV !== "production";
const { planning, details, search } = cacheManager_1.CacheManager.keys.dashboard;
exports.dashboardService = {
    getAllDashboardPlanning: async (page, pageSize, status) => {
        const cacheKey = planning.all(status, page);
        try {
            const { isChanged } = await cacheManager_1.CacheManager.check(planningPaper_1.PlanningPaper, "dbPlanning");
            if (isChanged) {
                await cacheManager_1.CacheManager.clearDbPlanning();
            }
            else {
                const cachedData = await redisCache_1.default.get(cacheKey);
                if (cachedData) {
                    if (devEnvironment)
                        console.log("✅ Get PlanningPaper from cache");
                    const parsed = JSON.parse(cachedData);
                    return { ...parsed, message: "Get PlanningPaper from cache" };
                }
            }
            const totalPlannings = await dashboardRepository_1.dashboardRepository.getDbPlanningCount();
            const totalPages = Math.ceil(totalPlannings / pageSize);
            const data = await dashboardRepository_1.dashboardRepository.getAllDbPlanning({
                page,
                pageSize,
                whereCondition: { status },
            });
            const responseData = {
                message: "get all data paper from db",
                data,
                totalPlannings,
                totalPages,
                currentPage: page,
            };
            await redisCache_1.default.set(cacheKey, JSON.stringify(responseData), "EX", 1800);
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
                await cacheManager_1.CacheManager.clearDbPlanningDetail();
            }
            else {
                const cachedData = await redisCache_1.default.get(cacheKey);
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
            await redisCache_1.default.set(cacheKey, JSON.stringify(stages), "EX", 1800);
            return { message: "get db planning detail succesfully", data: stages };
        }
        catch (error) {
            console.error("Error get db planning detail:", error);
            throw appError_1.AppError.ServerError();
        }
    },
    //get by field
    getDbPlanningByFields: async ({ field, keyword, page, pageSize, }) => {
        try {
            const fieldMap = {
                orderId: (paper) => paper.orderId,
                ghepKho: (paper) => paper.ghepKho,
                machine: (paper) => paper.chooseMachine,
                customerName: (paper) => paper.Order.Customer.customerName,
                companyName: (paper) => paper.Order.Customer.companyName,
                username: (paper) => paper.Order.User.fullName,
            };
            const key = field;
            if (!key || !fieldMap[key]) {
                throw appError_1.AppError.BadRequest("Invalid field parameter", "INVALID_FIELD");
            }
            const result = await (0, planningHelper_1.getDbPlanningByField)({
                cacheKey: search,
                keyword,
                getFieldValue: fieldMap[key],
                page,
                pageSize,
                message: `get all by ${field} from filtered cache`,
            });
            const planningIdsArr = result.data.map((p) => p.planningId);
            const planningIds = planningIdsArr;
            if (!planningIds || planningIds.length === 0) {
                return {
                    ...result,
                    data: [],
                };
            }
            const fullData = await dashboardRepository_1.dashboardRepository.getAllDbPlanning({
                whereCondition: {
                    planningId: planningIds,
                },
                paginate: false,
            });
            return { ...result, data: fullData };
            // return result;
        }
        catch (error) {
            console.error(`Failed to get customers by ${field}`, error);
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