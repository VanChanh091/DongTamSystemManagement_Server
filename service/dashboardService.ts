import dotenv from "dotenv";
dotenv.config();

import redisCache from "../assets/configs/connect/redis.connect";
import { Op } from "sequelize";
import { CacheKey } from "../utils/helper/cache/cacheKey";
import { dashboardRepository } from "../repository/dashboardRepository";
import { AppError } from "../utils/appError";
import { CacheManager } from "../utils/helper/cache/cacheManager";
import { PlanningPaper } from "../models/planning/planningPaper";
import { Request, Response } from "express";
import { dbPlanningColumns, mappingDbPlanningRow } from "../utils/mapping/dbPlanningRowAndColumn";
import { exportExcelDbPlanning } from "../utils/helper/excelExporter";
import { PlanningBoxTime } from "../models/planning/planningBoxMachineTime";
import { buildStagesDetails } from "../utils/helper/modelHelper/planningHelper";
import { meiliClient } from "../assets/configs/connect/meilisearch.connect";
import { searchFieldAtribute } from "../interface/types";

const devEnvironment = process.env.NODE_ENV !== "production";
const { planning, details } = CacheKey.dashboard;

export const dashboardService = {
  getAllDashboardPlanning: async (page: number, pageSize: number, status: string) => {
    const cacheKey = planning.all(status, page);

    try {
      const { isChanged } = await CacheManager.check(PlanningPaper, "dbPlanning");

      if (isChanged) {
        await CacheManager.clear("dbPlanning");
      } else {
        const cachedData = await redisCache.get(cacheKey);
        if (cachedData) {
          if (devEnvironment) console.log("✅ Get PlanningPaper from cache");
          const parsed = JSON.parse(cachedData);
          return { ...parsed, message: "Get PlanningPaper from cache" };
        }
      }

      const { rows, count } = await dashboardRepository.getAllDbPlanning({
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
        await CacheManager.clear("dbPlanningDetail");
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
      if (!box) return { message: "Planning is not box type", data: [] };

      const stages = await buildStagesDetails({
        detail: box,
        getBoxTimes: (d) => d.boxTimes,
        getPlanningBoxId: (d) => d.planningBoxId,
        getAllOverflow: (id) => dashboardRepository.getAllTimeOverflow(id),
      });

      await redisCache.set(cacheKey, JSON.stringify(stages), "EX", 1800);

      return { message: "get db planning detail succesfully", data: stages };
    } catch (error) {
      console.error("Error get db planning detail:", error);
      throw AppError.ServerError();
    }
  },

  //get by field
  getDbPlanningByFields: async ({ field, keyword, page, pageSize }: searchFieldAtribute) => {
    try {
      const validFields = ["orderId", "machine", "customerName", "companyName", "username"];
      if (!validFields.includes(field)) {
        throw AppError.BadRequest(`Field '${field}' is not supported for search`, "INVALID_FIELD");
      }

      const index = meiliClient.index("dashboard");

      // Tìm kiếm trên Meilisearch để lấy planningId
      const searchResult = await index.search(keyword, {
        attributesToSearchOn: [field],
        attributesToRetrieve: ["planningId"], // Chỉ lấy planningId
        page: Number(page) || 1,
        hitsPerPage: Number(pageSize) || 25,
      });

      const planningIdsArr = searchResult.hits.map((p: any) => p.planningId);
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
      const { rows } = await dashboardRepository.getAllDbPlanning({
        whereCondition: {
          planningId: { [Op.in]: planningIdsArr },
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
    } catch (error) {
      console.error(`Failed to get dashboard by ${field}`, error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  //export planning stage
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
        }),
      );

      return formatted;
    } catch (error) {
      console.error("❌ Export Excel error:", error);
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

      // Format dữ liệu thành 2 tầng
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
        }),
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
};
