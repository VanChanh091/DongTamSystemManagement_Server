"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.planningStopService = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const appError_1 = require("../../utils/appError");
const cacheManager_1 = require("../../utils/helper/cacheManager");
const planningPaper_1 = require("../../models/planning/planningPaper");
const timeOverflowPlanning_1 = require("../../models/planning/timeOverflowPlanning");
const sequelize_1 = require("sequelize");
const redisCache_1 = __importDefault(require("../../configs/redisCache"));
const planningRepository_1 = require("../../repository/planningRepository");
const devEnvironment = process.env.NODE_ENV !== "production";
const { stop } = cacheManager_1.CacheManager.keys.planning;
exports.planningStopService = {
    getPlanningStop: async (page, pageSize) => {
        try {
            const cacheKey = stop.page(page);
            const { isChanged } = await cacheManager_1.CacheManager.check([
                { model: planningPaper_1.PlanningPaper },
                { model: timeOverflowPlanning_1.timeOverflowPlanning, where: { planningId: { [sequelize_1.Op.ne]: null } } },
            ], "planningPaper");
            if (isChanged) {
                await cacheManager_1.CacheManager.clearPlanningStop();
            }
            else {
                const cachedData = await redisCache_1.default.get(cacheKey);
                if (cachedData) {
                    if (devEnvironment)
                        console.log("✅ Data PlanningPaper from Redis");
                    return { ...JSON.parse(cachedData), message: `get all cache planning stop` };
                }
            }
            const whereCondition = { status: "stop" };
            const totalPlannings = await planningRepository_1.planningRepository.getPlanningPaperCount(whereCondition);
            const totalPages = Math.ceil(totalPlannings / pageSize);
            const data = await planningRepository_1.planningRepository.getPlanningPaper({
                page,
                pageSize,
                whereCondition,
                paginate: true,
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
            console.error("Error fetching planning by machine:", error);
            throw appError_1.AppError.ServerError();
        }
    },
};
//# sourceMappingURL=planningStopService.js.map