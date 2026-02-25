import dotenv from "dotenv";
dotenv.config();

import { Op } from "sequelize";
import { Response } from "express";
import { AppError } from "../utils/appError";
import { CacheManager } from "../utils/helper/cache/cacheManager";
import { ReportPlanningPaper } from "../models/report/reportPlanningPaper";
import { reportRepository } from "../repository/reportRepository";
import { filterReportByField } from "../utils/helper/modelHelper/reportHelper";
import { ReportPlanningBox } from "../models/report/reportPlanningBox";
import { exportExcelResponse } from "../utils/helper/excelExporter";
import { mapReportPaperRow, reportPaperColumns } from "../utils/mapping/reportPaperRowAndColumn";
import { mapReportBoxRow, reportBoxColumns } from "../utils/mapping/reportBoxRowAndColumn";
import redisCache from "../assest/configs/redisCache";
import { CacheKey } from "../utils/helper/cache/cacheKey";

const devEnvironment = process.env.NODE_ENV !== "production";
const { paper, box } = CacheKey.report;

export const reportService = {
  //====================================PAPER========================================
  getReportPaper: async (machine: string, page: number, pageSize: number) => {
    try {
      const cacheKey = paper.all(machine, page);
      const { isChanged } = await CacheManager.check(ReportPlanningPaper, "reportPaper");

      if (isChanged) {
        await CacheManager.clear("reportPaper");
      } else {
        const cachedData = await redisCache.get(cacheKey);
        if (cachedData) {
          if (devEnvironment) console.log("✅ Data Report Planning Paper from Redis");
          const parsed = JSON.parse(cachedData);
          return { ...parsed, message: "Get all report planning paper from cache" };
        }
      }

      const totalOrders = await reportRepository.reportCount(ReportPlanningPaper);
      const totalPages = Math.ceil(totalOrders / pageSize);
      const offset = (page - 1) * pageSize;

      const data = await reportRepository.findReportPaperByMachine(machine, pageSize, offset);

      const responseData = {
        message: "get all report planning paper successfully",
        data,
        totalOrders,
        totalPages,
        currentPage: page,
      };

      await redisCache.set(cacheKey, JSON.stringify(responseData), "EX", 3600);

      return responseData;
    } catch (error) {
      console.error("get all reportPaper failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  getReportPaperByField: async (
    field: string,
    keyword: string,
    machine: string,
    page: number,
    pageSize: number,
  ) => {
    try {
      const fieldMap = {
        customerName: (report: ReportPlanningPaper) =>
          report?.Planning?.Order?.Customer?.customerName,
        dayReported: (report: ReportPlanningPaper) => report?.dayReport,
        shiftManagement: (report: ReportPlanningPaper) => report?.shiftManagement,
        orderId: (report: ReportPlanningPaper) => report?.Planning?.Order?.orderId,
      } as const;

      const key = field as keyof typeof fieldMap;

      if (!fieldMap[key]) {
        throw AppError.BadRequest("Missing required parameter", "MISSING_PARAMETERS");
      }
      const result = await filterReportByField({
        keyword: keyword,
        machine,
        getFieldValue: fieldMap[key],
        page,
        pageSize,
        message: `get all by ${field} from filtered cache`,
      });

      return result;
    } catch (error) {
      console.error(`Failed to get report paper by ${field}:`, error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  //====================================BOX========================================
  getReportBox: async (machine: string, page: number, pageSize: number) => {
    try {
      const cacheKey = box.all(machine, page);
      const { isChanged } = await CacheManager.check(ReportPlanningBox, "reportBox");

      if (isChanged) {
        await CacheManager.clear("reportBox");
      } else {
        const cachedData = await redisCache.get(cacheKey);
        if (cachedData) {
          if (devEnvironment) console.log("✅ Data Report Planning Box from Redis");
          const parsed = JSON.parse(cachedData);
          return { ...parsed, message: "Get all report planning box from cache" };
        }
      }

      const totalOrders = await reportRepository.reportCount(ReportPlanningBox);
      const totalPages = Math.ceil(totalOrders / pageSize);
      const offset = (page - 1) * pageSize;

      const data = await reportRepository.findAlReportBox(machine, pageSize, offset);
      const responseData = {
        message: "get all report planning paper successfully",
        data,
        totalOrders,
        totalPages,
        currentPage: page,
      };

      await redisCache.set(cacheKey, JSON.stringify(responseData), "EX", 3600);

      return responseData;
    } catch (error) {
      console.error("get all reportBox failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  getReportBoxByField: async (
    field: string,
    keyword: string,
    machine: string,
    page: number,
    pageSize: number,
  ) => {
    try {
      const fieldMap = {
        customerName: (report: ReportPlanningBox) =>
          report?.PlanningBox?.Order?.Customer?.customerName,
        dayReported: (report: ReportPlanningBox) => report?.dayReport,
        QcBox: (report: ReportPlanningBox) => report?.PlanningBox?.Order?.QC_box,
        shiftManagement: (report: ReportPlanningBox) => report?.shiftManagement,
        orderId: (report: ReportPlanningBox) => report?.PlanningBox?.Order?.orderId,
      } as const;

      const key = field as keyof typeof fieldMap;

      if (!fieldMap[key]) {
        throw AppError.BadRequest("Missing required parameter", "MISSING_PARAMETERS");
      }

      const result = await filterReportByField({
        keyword: keyword,
        machine,
        getFieldValue: fieldMap[key],
        page,
        pageSize,
        message: `get all by ${field} from filtered cache`,
        isBox: true,
      });

      return result;
    } catch (error) {
      console.error(`Failed to get report paper by ${field}:`, error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  //====================================EXPORT EXCEL========================================
  exportReportPaper: async (
    res: Response,
    fromDate: string | Date,
    toDate: string | Date,
    reportPaperId: number[],
    machine: string,
  ) => {
    try {
      let whereCondition: any = {};

      if (reportPaperId && reportPaperId.length > 0) {
        whereCondition.reportPaperId = reportPaperId;
      } else if (fromDate && toDate) {
        const start = new Date(fromDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);

        whereCondition.dayReport = { [Op.between]: [start, end] };
      }

      const data = await reportRepository.exportReportPaper(whereCondition, machine);

      await exportExcelResponse(res, {
        data: data,
        sheetName: "Báo cáo sản xuất giấy tấm",
        fileName: `report_paper_${machine}`,
        columns: reportPaperColumns,
        rows: mapReportPaperRow,
      });
    } catch (error) {
      console.error("Export Excel error:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  exportReportBox: async (
    res: Response,
    fromDate: string | Date,
    toDate: string | Date,
    reportBoxId: number[],
    machine: string,
  ) => {
    try {
      let whereCondition: any = {};

      if (reportBoxId && reportBoxId.length > 0) {
        whereCondition.reportBoxId = reportBoxId;
      } else if (fromDate && toDate) {
        const start = new Date(fromDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);

        whereCondition.dayReport = { [Op.between]: [start, end] };
      }

      const data = await reportRepository.exportReportBox(whereCondition, machine);

      await exportExcelResponse(res, {
        data: data,
        sheetName: "Báo cáo sản xuất thùng",
        fileName: `report_box_${machine}`,
        columns: reportBoxColumns,
        rows: mapReportBoxRow,
      });
    } catch (error) {
      console.error("Export Excel error:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },
};
