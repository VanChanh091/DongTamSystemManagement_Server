import dotenv from "dotenv";
dotenv.config();

import { Op } from "sequelize";
import { Response } from "express";
import { AppError } from "../utils/appError";
import { CacheKey } from "../utils/helper/cache/cacheKey";
import { normalizeVN } from "../utils/helper/normalizeVN";
import { dayjsUtc } from "../assets/configs/dayjs/dayjs.config";
import redisCache from "../assets/configs/connect/redis.connect";
import { CacheManager } from "../utils/helper/cache/cacheManager";
import { reportRepository } from "../repository/reportRepository";
import { ReportPlanningBox } from "../models/report/reportPlanningBox";
import { exportExcelStreamResponse } from "../utils/helper/excelExporter";
import {
  mapReportPaperRow,
  reportPaperColumns,
} from "../utils/mapping/report/reportPaperRowAndColumn";
import { ReportPlanningPaper } from "../models/report/reportPlanningPaper";
import { meiliClient } from "../assets/configs/connect/meilisearch.connect";
import { mapReportBoxRow, reportBoxColumns } from "../utils/mapping/report/reportBoxRowAndColumn";
import { DailyReportPerformance } from "../models/report/dailyReportPerformance";

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

      const queryOptions = reportRepository.buildReportPaperOptions({ machine, page, pageSize });
      const { rows, count } = await ReportPlanningPaper.findAndCountAll(queryOptions);
      const totalPages = Math.ceil(count / pageSize);

      if (rows.length === 0) {
        return {
          message: "No data",
          data: [],
          totalPapers: count,
          totalPages,
          currentPage: page,
          summaryByDate: {},
        };
      }

      const distinctDates = [
        ...new Set(
          rows.map((row: any) => {
            const rawDayReport = row.getDataValue("dayReport"); //lay gia tri goc tu db
            return new Date(rawDayReport).toISOString().split("T")[0];
          }),
        ),
      ];

      const perfData = await DailyReportPerformance.findAll({
        where: { machine, dayReport: { [Op.in]: distinctDates } },
        attributes: { exclude: ["createdAt", "updatedAt"] },
        raw: true,
      });

      const summaryByDate: Record<string, any> = {};

      perfData.forEach((item: any) => {
        const dateKey = item.dayReport;
        const flute = item.flute;
        const length = Number(item.totalLength) || 0;
        const durations = Number(item.totalDurations) || 0;

        if (!summaryByDate[dateKey]) {
          summaryByDate[dateKey] = {
            machineTotalLength: 0,
            machineTotalDuration: 0,
            flute: {},
          };
        }

        const dayGroup = summaryByDate[dateKey];

        // Tích lũy cho cả máy của ngày đó
        dayGroup.machineTotalLength += length;
        dayGroup.machineTotalDuration += durations;

        // Tính tốc độ cho từng loại sóng của ngày đó
        dayGroup.flute[flute] = durations > 0 ? Math.round((length / durations) * 100) / 100 : 0;
      });

      Object.keys(summaryByDate).forEach((dateKey) => {
        const dayGroup = summaryByDate[dateKey];
        dayGroup.machineSpeed =
          dayGroup.machineTotalDuration > 0
            ? Math.round((dayGroup.machineTotalLength / dayGroup.machineTotalDuration) * 100) / 100
            : 0;

        // Xóa bớt các biến tạm cho cục JSON nhẹ bớt khi gửi qua mạng
        delete dayGroup.machineTotalLength;
        delete dayGroup.machineTotalDuration;
      });

      const responseData = {
        message: "get all report planning paper successfully",
        data: rows,
        totalPapers: count,
        totalPages,
        currentPage: page,
        summaryByDate,
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

      const index = meiliClient.index("reportPapers");

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

      const searchOptions: any = {
        filter: filters.join(" AND "),
        attributesToSearchOn: searchKeyword ? [field] : [],
        attributesToRetrieve: ["reportPaperId"],
        sort: ["dayReported:desc"],
        page: Number(page) || 1,
        hitsPerPage: Number(pageSize) || 25,
      };

      const searchResult = await index.search(searchKeyword, searchOptions);

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
      const queryOptions = reportRepository.buildReportPaperOptions({
        machine,
        whereCondition: {
          reportPaperId: { [Op.in]: paperIds },
        },
      });
      const result = await ReportPlanningPaper.findAll(queryOptions);

      // Sắp xếp lại thứ tự của SQL theo đúng thứ tự của Meilisearch
      const finalData = paperIds
        .map((id) => result.find((r) => r.reportPaperId === id))
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

      const queryOptions = reportRepository.buildReportBoxOptions({
        machine,
        page,
        pageSize,
        whereCondition: { machine },
      });
      const { rows, count } = await ReportPlanningBox.findAndCountAll(queryOptions);

      const totalPages = Math.ceil(count / pageSize);

      const responseData = {
        message: "get all report planning box successfully",
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

      const index = meiliClient.index("reportBoxes");

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

      const searchOptions: any = {
        filter: filters.join(" AND "),
        attributesToSearchOn: searchKeyword ? [field] : [],
        attributesToRetrieve: ["reportBoxId"],
        sort: ["dayReported:desc"],
        page: Number(page) || 1,
        hitsPerPage: Number(pageSize) || 25,
      };

      const searchResult = await index.search(searchKeyword, searchOptions);

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
      const queryOptions = reportRepository.buildReportBoxOptions({
        machine,
        whereCondition: { machine, reportBoxId: { [Op.in]: boxIds } },
      });
      const result = await ReportPlanningBox.findAll(queryOptions);

      // Sắp xếp lại thứ tự của SQL theo đúng thứ tự của Meilisearch
      const finalData = boxIds
        .map((id) => result.find((r) => r.reportBoxId === id))
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
    machine: string,
    userName: string,
  ) => {
    try {
      let whereCondition: any = {};

      if (fromDate && toDate) {
        const startTimestamp = dayjsUtc(fromDate).startOf("day").toDate();
        const endTimestamp = dayjsUtc(toDate).endOf("day").toDate();

        // console.log(`start: ${fromDate} - end: ${toDate}`);
        // console.log(`startTimestamp: ${startTimestamp} - endTimestamp: ${endTimestamp}`);

        whereCondition.dayReport = { [Op.between]: [startTimestamp, endTimestamp] };
      }

      const baseQuery: any = reportRepository.buildReportPaperOptions({ machine, whereCondition });

      const safeMachineName = machine.replace(/\s+/g, "-");

      await exportExcelStreamResponse(res, {
        baseQuery: baseQuery,
        model: ReportPlanningPaper,
        sheetName: "Báo cáo sản xuất giấy tấm",
        fileName: `bao-cao-${normalizeVN(safeMachineName)}`,
        columns: reportPaperColumns,
        rows: mapReportPaperRow,
        userName: userName,
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
    machine: string,
    userName: string,
  ) => {
    try {
      let whereCondition: any = { machine: machine };

      if (fromDate && toDate) {
        const startTimestamp = dayjsUtc(fromDate).startOf("day").toDate();
        const endTimestamp = dayjsUtc(toDate).endOf("day").toDate();

        // console.log(`start: ${fromDate} - end: ${toDate}`);
        // console.log(`startTimestamp: ${startTimestamp} - endTimestamp: ${endTimestamp}`);

        whereCondition.dayReport = { [Op.between]: [startTimestamp, endTimestamp] };
      }

      const baseQuery: any = reportRepository.buildReportBoxOptions({ machine, whereCondition });

      const safeMachineName = machine.replace(/\s+/g, "-");

      await exportExcelStreamResponse(res, {
        baseQuery: baseQuery,
        model: ReportPlanningBox,
        sheetName: "Báo cáo sản xuất thùng",
        fileName: `bao-cao-${normalizeVN(safeMachineName)}`,
        columns: reportBoxColumns,
        rows: mapReportBoxRow,
        userName: userName,
      });
    } catch (error) {
      console.error("Export Excel error:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },
};
