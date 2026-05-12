import dotenv from "dotenv";
dotenv.config();

import { Op } from "sequelize";
import { Response } from "express";
import { AppError } from "../utils/appError";
import { CacheManager } from "../utils/helper/cache/cacheManager";
import { ReportPlanningPaper } from "../models/report/reportPlanningPaper";
import { reportRepository } from "../repository/reportRepository";
import { ReportPlanningBox } from "../models/report/reportPlanningBox";
import { exportExcelResponse } from "../utils/helper/excelExporter";
import {
  mapReportPaperRow,
  reportPaperColumns,
} from "../utils/mapping/report/reportPaperRowAndColumn";
import { mapReportBoxRow, reportBoxColumns } from "../utils/mapping/report/reportBoxRowAndColumn";
import redisCache from "../assets/configs/connect/redis.connect";
import { CacheKey } from "../utils/helper/cache/cacheKey";
import { normalizeVN } from "../utils/helper/normalizeVN";
import { meiliClient } from "../assets/configs/connect/meilisearch.connect";
import { dayjsUtc } from "../assets/configs/dayjs/dayjs.config";

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

      const offset = (page - 1) * pageSize;
      const { rows, count } = await reportRepository.findReportPaperByMachine(
        machine,
        pageSize,
        offset,
      );
      const totalPages = Math.ceil(count / pageSize);

      const responseData = {
        message: "get all report planning paper successfully",
        data: rows,
        totalPapers: count,
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

  getReportPaperByField: async ({
    field,
    keyword,
    machine,
    page,
    pageSize,
    startDate,
    endDate,
  }: {
    field: string;
    keyword: string;
    machine: string;
    page: number;
    pageSize: number;
    startDate?: string;
    endDate?: string;
  }) => {
    try {
      const validFields = ["orderId", "customerName", "dayReported", "shiftManagement"];
      if (!validFields.includes(field)) {
        throw AppError.BadRequest(`Field '${field}' is not supported for search`, "INVALID_FIELD");
      }

      // Lọc theo ngày nếu có
      let searchKeyword = keyword;
      let filters = [`chooseMachine = "${machine}"`];

      if (field === "dayReported") {
        searchKeyword = "";

        if (startDate && endDate) {
          const startTimestamp = dayjsUtc.utc(startDate).startOf("day").unix();
          filters.push(`dayReported >= ${startTimestamp}`);

          const endTimestamp = dayjsUtc.utc(endDate).endOf("day").unix();
          filters.push(`dayReported <= ${endTimestamp}`);
        }
      }

      const index = meiliClient.index("reportPapers");

      const searchResult = await index.search(searchKeyword, {
        filter: filters.join(" AND "),
        attributesToSearchOn: searchKeyword ? [field] : [],
        attributesToRetrieve: ["reportPaperId"],
        page: Number(page) || 1,
        hitsPerPage: Number(pageSize) || 25,
      });

      const paperIds = searchResult.hits.map((hit: any) => hit.reportPaperId);
      if (paperIds.length === 0) {
        return {
          message: "No report papers found",
          data: [],
          totalPapers: 0,
          totalPages: 1,
          currentPage: page,
        };
      }

      // Truy vấn DB để lấy data dựa trên orderIds
      const fullOrders = (await reportRepository.getDataReportPaperOrBox({
        isBox: false,
        machine,
        whereCondition: {
          reportPaperId: { [Op.in]: paperIds },
        },
      })) as ReportPlanningPaper[];

      // Sắp xếp lại thứ tự của SQL theo đúng thứ tự của Meilisearch
      const finalData = paperIds
        .map((id) => fullOrders.find((r) => r.reportPaperId === id))
        .filter(Boolean);

      return {
        message: "Get orders from Meilisearch & DB successfully",
        data: finalData,
        totalPapers: searchResult.totalHits,
        totalPages: searchResult.totalPages,
        currentPage: page,
      };
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

      const offset = (page - 1) * pageSize;
      const { rows, count } = await reportRepository.findAllReportBox(machine, pageSize, offset);

      const totalPages = Math.ceil(count / pageSize);

      const responseData = {
        message: "get all report planning paper successfully",
        data: rows,
        totalBoxes: count,
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

  getReportBoxByField: async ({
    field,
    keyword,
    machine,
    page,
    pageSize,
    startDate,
    endDate,
  }: {
    field: string;
    keyword: string;
    machine: string;
    page: number;
    pageSize: number;
    startDate?: string;
    endDate?: string;
  }) => {
    try {
      const validFields = ["orderId", "customerName", "dayReported", "QC_box", "shiftManagement"];
      if (!validFields.includes(field)) {
        throw AppError.BadRequest(`Field '${field}' is not supported for search`, "INVALID_FIELD");
      }

      // Lọc theo ngày nếu có
      let searchKeyword = keyword;
      let filters = [`machine = "${machine}"`];

      if (field === "dayReported") {
        searchKeyword = "";

        if (startDate && endDate) {
          const startTimestamp = dayjsUtc.utc(startDate).startOf("day").unix();
          filters.push(`dayReported >= ${startTimestamp}`);

          const endTimestamp = dayjsUtc.utc(endDate).endOf("day").unix();
          filters.push(`dayReported <= ${endTimestamp}`);
        }
      }

      const index = meiliClient.index("reportBoxes");

      const searchResult = await index.search(searchKeyword, {
        filter: filters.join(" AND "),
        attributesToSearchOn: searchKeyword ? [field] : [],
        attributesToRetrieve: ["reportBoxId"],
        page: Number(page) || 1,
        hitsPerPage: Number(pageSize) || 25,
      });

      const boxIds = searchResult.hits.map((hit: any) => hit.reportBoxId);
      if (boxIds.length === 0) {
        return {
          message: "No report boxes found",
          data: [],
          totalBoxes: 0,
          totalPages: 1,
          currentPage: page,
        };
      }

      // Truy vấn DB để lấy data dựa trên orderIds
      const fullOrders = (await reportRepository.getDataReportPaperOrBox({
        isBox: true,
        machine,
        whereCondition: {
          reportBoxId: { [Op.in]: boxIds },
        },
      })) as ReportPlanningBox[];

      // Sắp xếp lại thứ tự của SQL theo đúng thứ tự của Meilisearch
      const finalData = boxIds
        .map((id) => fullOrders.find((r) => r.reportBoxId === id))
        .filter(Boolean);

      return {
        message: "Get orders from Meilisearch & DB successfully",
        data: finalData,
        totalBoxes: searchResult.totalHits,
        totalPages: searchResult.totalPages,
        currentPage: page,
      };
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
        const startTimestamp = dayjsUtc(fromDate).startOf("day").toDate();
        const endTimestamp = dayjsUtc(toDate).endOf("day").toDate();

        // console.log(`start: ${fromDate} - end: ${toDate}`);
        // console.log(`startTimestamp: ${startTimestamp} - endTimestamp: ${endTimestamp}`);

        whereCondition.dayReport = { [Op.between]: [startTimestamp, endTimestamp] };
      }

      const data = await reportRepository.exportReportPaper(whereCondition, machine);

      const safeMachineName = machine.replace(/\s+/g, "-");

      await exportExcelResponse(res, {
        data: data,
        sheetName: "Báo cáo sản xuất giấy tấm",
        fileName: `bao-cao-${normalizeVN(safeMachineName)}`,
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
      let whereCondition: any = { machine: machine };

      if (reportBoxId && reportBoxId.length > 0) {
        whereCondition.reportBoxId = reportBoxId;
      } else if (fromDate && toDate) {
        const startTimestamp = dayjsUtc(fromDate).startOf("day").toDate();
        const endTimestamp = dayjsUtc(toDate).endOf("day").toDate();

        // console.log(`start: ${fromDate} - end: ${toDate}`);
        // console.log(`startTimestamp: ${startTimestamp} - endTimestamp: ${endTimestamp}`);

        whereCondition.dayReport = { [Op.between]: [startTimestamp, endTimestamp] };
      }

      const data = await reportRepository.exportReportBox(whereCondition, machine);

      const safeMachineName = machine.replace(/\s+/g, "-");

      await exportExcelResponse(res, {
        data: data,
        sheetName: "Báo cáo sản xuất thùng",
        fileName: `bao-cao-${normalizeVN(safeMachineName)}`,
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
