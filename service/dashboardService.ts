import dotenv from "dotenv";
dotenv.config();
import redisCache from "../configs/redisCache";
import { dashboardRepository } from "../repository/dashboardRepository";
import { AppError } from "../utils/appError";
import { CacheManager } from "../utils/helper/cacheManager";
import { PlanningPaper } from "../models/planning/planningPaper";
import { Op } from "sequelize";
import { Request, Response } from "express";
import { dbPlanningColumns, mappingDbPlanningRow } from "../utils/mapping/dbPlanningRowAndColumn";
import { exportExcelDbPlanning } from "../utils/helper/excelExporter";
import { PlanningBoxTime } from "../models/planning/planningBoxMachineTime";
import { getDbPlanningByField } from "../utils/helper/modelHelper/planningHelper";

const devEnvironment = process.env.NODE_ENV !== "production";
const { planning, details, search } = CacheManager.keys.dashboard;

export const dashboardService = {
  getAllDashboardPlanning: async (page: number, pageSize: number) => {
    const cacheKey = planning.all(page);

    try {
      const { isChanged } = await CacheManager.check(PlanningPaper, "dbPlanning");

      if (isChanged) {
        await CacheManager.clearDbPlanning();
      } else {
        const cachedData = await redisCache.get(cacheKey);
        if (cachedData) {
          if (devEnvironment) console.log("✅ Get PlanningPaper from cache");
          const parsed = JSON.parse(cachedData);
          return { ...parsed, message: "Get PlanningPaper from cache" };
        }
      }

      const totalPlannings = await dashboardRepository.getDbPlanningCount();
      const totalPages = Math.ceil(totalPlannings / pageSize);

      const data = await dashboardRepository.getAllDbPlanning({ page, pageSize });

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
      console.error("Error get db planning:", error);
      throw AppError.ServerError();
    }
  },

  getDbPlanningDetail: async (planningId: number) => {
    const cacheKey = details.all(planningId);

    try {
      const { isChanged } = await CacheManager.check(PlanningBoxTime, "dbDetail");

      if (isChanged) {
        await CacheManager.clearDbPlanningDetail();
      } else {
        const cachedData = await redisCache.get(cacheKey);
        if (cachedData) {
          if (devEnvironment) console.log("📦 Get Planning STAGES from cache");
          const parsed = JSON.parse(cachedData);
          return { message: "Get PlanningPaper from cache", data: parsed };
        }
      }

      //get data detail
      const detail = await dashboardRepository.getDBPlanningDetail(planningId);
      if (!detail) {
        throw AppError.NotFound("detail not found", "DETAIL_NOT_FOUND");
      }

      const box = detail.PlanningBox;

      //get stage
      const normalStages = box?.boxTimes?.map((stage) => stage.toJSON()) ?? [];

      //get all time overflow
      const allOverflow = await dashboardRepository.getAllTimeOverflow(box?.planningBoxId ?? 0);

      const overflowByMachine: Record<string, any> = {};
      for (const ov of allOverflow) {
        overflowByMachine[ov.machine as string] = ov;
      }

      const stages = normalStages.map((stage) => ({
        ...stage,
        timeOverFlow: overflowByMachine[String(stage.machine)] ?? null,
      }));

      await redisCache.set(cacheKey, JSON.stringify(stages), "EX", 1800);

      return { message: "get db planning detail succesfully", data: stages };
    } catch (error) {
      console.error("Error get db planning detail:", error);
      throw AppError.ServerError();
    }
  },

  //get by field
  getDbPlanningByFields: async ({
    field,
    keyword,
    page,
    pageSize,
  }: {
    field: string;
    keyword: string;
    page: number;
    pageSize: number;
  }) => {
    try {
      const fieldMap = {
        orderId: (paper: PlanningPaper) => paper.orderId,
        ghepKho: (paper: PlanningPaper) => paper.ghepKho,
        machine: (paper: PlanningPaper) => paper.chooseMachine,
        customerName: (paper: PlanningPaper) => paper.Order.Customer.customerName,
        companyName: (paper: PlanningPaper) => paper.Order.Customer.companyName,
        username: (paper: PlanningPaper) => paper.Order.User.fullName,
      } as const;

      const key = field as keyof typeof fieldMap;

      if (!key || !fieldMap[key]) {
        throw AppError.BadRequest("Invalid field parameter", "INVALID_FIELD");
      }

      const result = await getDbPlanningByField({
        cacheKey: search,
        keyword,
        getFieldValue: fieldMap[key],
        page,
        pageSize,
        message: `get all by ${field} from filtered cache`,
      });

      const planningIdsArr = result.data.map((p: any) => p.planningId);
      const planningIds = planningIdsArr;

      if (!planningIds || planningIds.length === 0) {
        return {
          ...result,
          data: [],
        };
      }

      const fullData = await dashboardRepository.getAllDbPlanning({
        whereCondition: {
          planningId: planningIds,
        },
        paginate: false,
      });

      return { ...result, data: fullData };
      // return result;
    } catch (error) {
      console.error(`Failed to get customers by ${field}`, error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  //export excel
  exportExcelDbPlanning: async (req: Request, res: Response) => {
    const { username, dayStart, machine, all = false } = req.body;

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
      } else if (dayStart) {
        const start = new Date(dayStart);
        start.setHours(0, 0, 0, 0);
        const end = new Date(dayStart);
        end.setHours(23, 59, 59, 999);

        whereCondition.dayStart = { [Op.between]: [start, end] };
      }

      const rawPapers = await dashboardRepository.exportExcelDbPlanning({ whereCondition });

      // Format dữ liệu thành 2 tầng cho FE
      const formatted = await Promise.all(
        rawPapers.map(async (paper) => {
          const box = paper.PlanningBox;

          // ===== Stages (7 công đoạn) =====
          const normalStages = box?.boxTimes?.map((stage) => stage.toJSON()) ?? [];

          const allOverflow = await dashboardRepository.getAllTimeOverflow(box?.planningBoxId ?? 0);

          const overflowByMachine: Record<string, any> = {};
          for (const ov of allOverflow) {
            overflowByMachine[ov.machine as string] = ov;
          }

          // ===== Gắn overflow vào từng stage =====
          const stages = normalStages.map((stage) => ({
            ...stage,
            timeOverFlow: overflowByMachine[String(stage.machine)] ?? null,
          }));

          // ===== Remove nested (giữ sạch dữ liệu) =====
          const paperJson: any = paper.toJSON();
          delete paperJson.PlanningBox;
          delete paperJson.Order?.box;

          return { ...paperJson, stages };
        })
      );

      await exportExcelDbPlanning(res, {
        data: formatted,
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

  getAllDbPlanningStage: async () => {
    try {
      const rawPapers = await dashboardRepository.exportExcelDbPlanning({});

      // Format dữ liệu thành 2 tầng cho FE
      const formatted = await Promise.all(
        rawPapers.map(async (paper) => {
          const box = paper.PlanningBox;

          // ===== Stages (7 công đoạn) =====
          const normalStages = box?.boxTimes?.map((stage) => stage.toJSON()) ?? [];

          const allOverflow = await dashboardRepository.getAllTimeOverflow(box?.planningBoxId ?? 0);

          const overflowByMachine: Record<string, any> = {};
          for (const ov of allOverflow) {
            overflowByMachine[ov.machine as string] = ov;
          }

          // ===== Gắn overflow vào từng stage =====
          const stages = normalStages.map((stage) => ({
            ...stage,
            timeOverFlow: overflowByMachine[String(stage.machine)] ?? null,
          }));

          // ===== Remove nested (giữ sạch dữ liệu) =====
          const paperJson: any = paper.toJSON();
          delete paperJson.PlanningBox;
          delete paperJson.Order?.box;

          return { ...paperJson, stages };
        })
      );

      return formatted;
    } catch (error) {
      console.error("❌ Export Excel error:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },
};
