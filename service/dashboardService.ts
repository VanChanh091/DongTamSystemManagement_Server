import redisCache from "../configs/redisCache";
import { dashboardRepository } from "../repository/dashboardRepository";
import { AppError } from "../utils/appError";
import dotenv from "dotenv";
import { CacheManager } from "../utils/helper/cacheManager";
import { PlanningPaper } from "../models/planning/planningPaper";
import { Op } from "sequelize";
import { Request, Response } from "express";
import { dbPlanningColumns, mappingDbPlanningRow } from "../utils/mapping/dbPlanningRowAndColumn";
import { exportExcelDbPlanning } from "../utils/helper/excelExporter";
dotenv.config();

const devEnvironment = process.env.NODE_ENV !== "production";
const { dashboard } = CacheManager.keys;

export const dashboardService = {
  getAllDashboardPlanning: async (page: number, pageSize: number) => {
    const cacheKey = dashboard.paper(page);

    try {
      // const cachedData = await redisCache.get(cacheKey);
      // if (cachedData) {
      //   if (cachedData) {
      //     if (devEnvironment) console.log("✅ Get PlanningPaper from cache");
      //     const parsed = JSON.parse(cachedData);
      //     return { ...parsed, message: "Get PlanningPaper from cache" };
      //   }
      // }

      const whereCondition = {
        // status: "complete",
        // dayCompleted: { [Op.ne]: null },
      };

      const totalPlannings = await dashboardRepository.getDbPlanningCount(whereCondition);
      const totalPages = Math.ceil(totalPlannings / pageSize);
      const offset = (page - 1) * pageSize;

      const data = await dashboardRepository.getAllDbPlanning({ offset, pageSize });

      const responseData = {
        message: "get all data paper from db",
        data,
        totalPlannings,
        totalPages,
        currentPage: page,
      };

      // await redisCache.set(cacheKey, JSON.stringify(responseData), "EX", 1800);

      return responseData;
    } catch (error) {
      console.error("Error add Report Production:", error);
      throw AppError.ServerError();
    }
  },

  //get by field
  getDbPlanningByFields: async (field: string, keyword: string, page: number, pageSize: number) => {
    try {
      const fieldMap = {
        orderId: (paper: PlanningPaper) => paper.orderId,
        customerName: (paper: PlanningPaper) => paper.Order.Customer.customerName,
        companyName: (paper: PlanningPaper) => paper.Order.Customer.companyName,
        ghepKho: (paper: PlanningPaper) => paper.ghepKho,
        username: (paper: PlanningPaper) => paper.Order.User.fullName,
        machine: (paper: PlanningPaper) => paper.chooseMachine,
      } as const;

      const key = field as keyof typeof fieldMap;

      if (!key || !fieldMap[key]) {
        throw AppError.BadRequest("Invalid field parameter", "INVALID_FIELD");
      }

      // const result = await filterDataFromCache({
      //   model: Customer,
      //   cacheKey: customer.search,
      //   keyword: keyword,
      //   getFieldValue: fieldMap[key],
      //   page,
      //   pageSize,
      //   message: `get all by ${field} from filtered cache`,
      // });

      // return result;
    } catch (error) {
      console.error(`Failed to get customers by ${field}`, error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  //export excel
  exportExcelDbPlanning: async (req: Request, res: Response) => {
    const { username, dayStart, machine, customerName, all = false } = req.body;

    try {
      let whereCondition: any = {};

      if (all === "true") {
        // xuất toàn bộ
      } else if (username) {
        whereCondition["$Order.User.fullName$"] = {
          [Op.like]: `%${username}%`,
        };
      } else if (machine) {
        whereCondition["chooseMachine"] = {
          [Op.like]: `%${machine}%`,
        };
      } else if (customerName) {
        whereCondition["$Order.Customer.customerName$"] = {
          [Op.like]: `%${customerName}%`,
        };
      } else if (dayStart) {
        const start = new Date(dayStart);
        start.setHours(0, 0, 0, 0);
        const end = new Date(dayStart);
        end.setHours(23, 59, 59, 999);

        whereCondition.dayStart = { [Op.between]: [start, end] };
      }

      const data = await dashboardRepository.getAllDbPlanning({ whereCondition, paginate: false });

      await exportExcelDbPlanning(res, {
        data: data,
        sheetName: "Tổng Hợp Sản Xuất",
        fileName: "dbPlanning",
        columns: dbPlanningColumns,
        rows: mappingDbPlanningRow,
      });
    } catch (error) {
      console.error("❌ Export Excel error:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },
};
