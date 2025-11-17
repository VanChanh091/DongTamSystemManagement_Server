import { Op } from "sequelize";
import redisCache from "../configs/redisCache";
import { dashboardRepository } from "../repository/dashboardRepository";
import { AppError } from "../utils/appError";
import dotenv from "dotenv";
dotenv.config();

const devEnvironment = process.env.NODE_ENV !== "production";

export const dashboardService = {
  getAllPlaningPaper: async (page: number, pageSize: number, refresh: boolean) => {
    const cacheKey = `data:paper:all:${page}`;

    try {
      if (refresh === true) {
        await redisCache.del(cacheKey);
      }

      const cachedData = await redisCache.get(cacheKey);
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        const planningArray = parsed?.data ?? [];

        if (planningArray.length > 0) {
          if (devEnvironment) console.log("✅ Get Planning from cache");
          return {
            message: "Get PlanningPaper from cache",
            data: planningArray,
            totalPlannings: parsed.totalPlannings,
            totalPages: parsed.totalPages,
            page: parsed.page,
          };
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

  getAllPlaningBox: async (page: number, pageSize: number, refresh: boolean) => {
    const cacheKey = `data:box:all:${pageSize}`;
    try {
      if (refresh === true) {
        await redisCache.del(cacheKey);
      }

      const cachedData = await redisCache.get(cacheKey);
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        const planningArray = parsed?.data ?? [];

        if (planningArray.length > 0) {
          if (devEnvironment) console.log("✅ Get PlanningBox from cache");
          return {
            message: "Get PlanningBox from cache",
            data: planningArray,
            totalPlannings: parsed.totalPlannings,
            totalPages: parsed.totalPages,
            page: parsed.page,
          };
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
