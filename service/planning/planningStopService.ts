import dotenv from "dotenv";
dotenv.config();
import { AppError } from "../../utils/appError";
import { CacheManager } from "../../utils/helper/cacheManager";
import { PlanningPaper } from "../../models/planning/planningPaper";
import { timeOverflowPlanning } from "../../models/planning/timeOverflowPlanning";
import { Op } from "sequelize";
import redisCache from "../../configs/redisCache";
import { planningRepository } from "../../repository/planningRepository";

const devEnvironment = process.env.NODE_ENV !== "production";
const { stop } = CacheManager.keys.planning;

export const planningStopService = {
  getPlanningStop: async (page: number, pageSize: number) => {
    try {
      const cacheKey = stop.page(page);
      const { isChanged } = await CacheManager.check(
        [
          { model: PlanningPaper },
          { model: timeOverflowPlanning, where: { planningId: { [Op.ne]: null } } },
        ],
        "planningPaper"
      );

      if (isChanged) {
        await CacheManager.clearPlanningStop();
      } else {
        const cachedData = await redisCache.get(cacheKey);
        if (cachedData) {
          if (devEnvironment) console.log("✅ Data PlanningPaper from Redis");
          return { ...JSON.parse(cachedData), message: `get all cache planning stop` };
        }
      }

      const whereCondition = { status: "stop" };

      const totalPlannings = await planningRepository.getPlanningPaperCount(whereCondition);
      const totalPages = Math.ceil(totalPlannings / pageSize);

      const data = await planningRepository.getPlanningPaper({
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

      await redisCache.set(cacheKey, JSON.stringify(responseData), "EX", 1800);

      return responseData;
    } catch (error) {
      console.error("Error fetching planning by machine:", error);
      throw AppError.ServerError();
    }
  },
};
