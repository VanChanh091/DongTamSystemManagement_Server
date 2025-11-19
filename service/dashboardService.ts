import { Op } from "sequelize";
import redisCache from "../configs/redisCache";
import { dashboardRepository } from "../repository/dashboardRepository";
import { AppError } from "../utils/appError";
import dotenv from "dotenv";
import { CacheManager } from "../utils/helper/cacheManager";
dotenv.config();

const devEnvironment = process.env.NODE_ENV !== "production";
const { dashboard } = CacheManager.keys;

export const dashboardService = {
  getAllPlaningPaper: async (page: number, pageSize: number) => {
    const cacheKey = dashboard.paper(page);

    try {
      const cachedData = await redisCache.get(cacheKey);
      if (cachedData) {
        if (cachedData) {
          if (devEnvironment) console.log("✅ Get PlanningPaper from cache");
          const parsed = JSON.parse(cachedData);
          return { ...parsed, message: "Get PlanningPaper from cache" };
        }
      }

      const whereCondition = {
        status: "complete",
        dayCompleted: { [Op.ne]: null },
      };

      const totalPlannings = await dashboardRepository.getPlanningPaperCount(whereCondition);
      const totalPages = Math.ceil(totalPlannings / pageSize);
      const offset = (page - 1) * pageSize;

      const data = await dashboardRepository.getAllPlaningPaper(whereCondition, offset, pageSize);

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
      console.error("Error add Report Production:", error);
      throw AppError.ServerError();
    }
  },

  getAllPlaningBox: async (page: number, pageSize: number) => {
    const cacheKey = dashboard.box(page);

    try {
      const cachedData = await redisCache.get(cacheKey);
      if (cachedData) {
        if (cachedData) {
          if (cachedData) {
            if (devEnvironment) console.log("✅ Get PlanningBox from cache");
            const parsed = JSON.parse(cachedData);
            return { ...parsed, message: "Get PlanningBox from cache" };
          }
        }
      }

      // Lấy tất cả PlanningBox có công đoạn hoàn thành
      const plannings = await dashboardRepository.getAllPlaningBox();

      // Flatten data: mỗi công đoạn = 1 dòng
      const flattened = plannings.flatMap((planning) => {
        const plainPlanning: any = planning.toJSON();
        return plainPlanning.boxTimes.map((step: any) => {
          const row = {
            ...plainPlanning,
            boxTime: step,
            timeOverFlow: plainPlanning.timeOverFlow.filter(
              (ov: any) => ov.machine === step.machine
            ),
          };

          // Xóa boxTimes vì không cần nữa
          delete row.boxTimes;
          return row;
        });
      });

      // Pagination theo công đoạn
      const totalPlannings = flattened.length;
      const totalPages = Math.ceil(totalPlannings / pageSize);
      const offset = (page - 1) * pageSize;
      const paginated = flattened.slice(offset, offset + pageSize);

      const responseData = {
        message: "get all data box from db",
        data: paginated,
        totalPlannings,
        totalPages,
        currentPage: page,
      };

      await redisCache.set(cacheKey, JSON.stringify(responseData), "EX", 1800);

      return responseData;
    } catch (error) {
      console.error("Error getAllDataBox:", error);
      throw AppError.ServerError();
    }
  },
};
