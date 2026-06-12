import dotenv from "dotenv";
dotenv.config();

import { Response } from "express";
import { Op, Transaction } from "sequelize";
import { AppError } from "../utils/appError";
import { meiliService } from "./meiliService";
import { MEILI_INDEX } from "../assets/labelFields";
import { ScrapReport } from "../models/scrap/scrapReport";
import { dayjsUtc } from "../assets/configs/dayjs/dayjs.config";
import { reportRepository } from "../repository/reportRepository";
import { runInTransaction } from "../utils/helper/transactionHelper";
import { manufactureRepo } from "../repository/manufactureRepository";
import { meiliClient } from "../assets/configs/connect/meilisearch.connect";
import { scrapReportRepository } from "../repository/scrapReportRepository";
import { meiliTransformer } from "../assets/configs/meilisearch/meiliTransformer";
import { CacheManager } from "../utils/helper/cache/cacheManager";
import redisCache from "../assets/configs/connect/redis.connect";
import { CacheKey } from "../utils/helper/cache/cacheKey";

const devEnvironment = process.env.NODE_ENV !== "production";
const { scrap } = CacheKey.report;

export const scrapReportService = {
  getScrapReportWaitingCheck: async () => {
    try {
      const options = scrapReportRepository.buildScrapReportOptions({
        whereCondition: { status: { [Op.in]: ["pending", "rejected"] } },
        optionsField: {
          order: [
            ["status", "DESC"],
            ["scrapId", "DESC"],
          ],
        },
      });
      const data = await ScrapReport.findAll(options);

      return { message: "Get scrap reports waiting check successfully", data };
    } catch (error) {
      console.error("❌ get scrap reports waiting check failed:", error);
      throw AppError.ServerError();
    }
  },

  getScrapReportByStatus: async ({
    page,
    pageSize,
    status,
    machine,
  }: {
    page: number;
    pageSize: number;
    status: string;
    machine: string;
  }) => {
    try {
      // const cacheKey = scrap.all(machine, status, page);
      // const { isChanged } = await CacheManager.check([{ model: ScrapReport }], "reportScrap");

      // if (isChanged) {
      //   await CacheManager.clear("reportScrap");
      // } else {
      //   const cachedData = await redisCache.get(cacheKey);
      //   if (cachedData) {
      //     if (devEnvironment) console.log("✅ Data Scrap Reports from Redis");
      //     const parsed = JSON.parse(cachedData);
      //     return { ...parsed, message: `Get all scrap reports from cache` };
      //   }
      // }

      const options = scrapReportRepository.buildScrapReportOptions({
        page,
        pageSize,
        whereCondition: { machine, status },
      });
      const { rows, count } = await ScrapReport.findAndCountAll(options);

      const responseData = {
        message: "Get all scrap reports successfully",
        data: rows,
        totalScrapReports: count,
        totalPages: Math.ceil(count / pageSize),
        currentPage: page,
      };

      // await redisCache.set(cacheKey, JSON.stringify(responseData), "EX", 3600);

      return responseData;
    } catch (error) {
      console.error("❌ get scrap reports by status failed:", error);
      throw AppError.ServerError();
    }
  },

  getScrapReportByField: async ({
    page,
    pageSize,
    field,
    keyword,
    startDate,
    endDate,
    status,
    machine,
  }: {
    page: number;
    pageSize: number;
    status: string;
    field: string;
    keyword: string;
    machine: string;
    startDate?: string;
    endDate?: string;
  }) => {
    try {
      const validFields = ["reportedBy", "reportedAt"];
      if (!validFields.includes(field)) {
        throw AppError.BadRequest(`Field '${field}' is not supported for search`, "INVALID_FIELD");
      }

      const index = meiliClient.index("scrapReports");

      let searchKeyword = keyword;
      let filter = [];

      if (field === "reportedAt") {
        searchKeyword = "";

        if (startDate && endDate) {
          const startTimestamp = dayjsUtc.utc(startDate).startOf("day").unix();
          filter.push(`reportedAt >= ${startTimestamp}`);

          const endTimestamp = dayjsUtc.utc(endDate).endOf("day").unix();
          filter.push(`reportedAt <= ${endTimestamp}`);
        }

        // console.log(`start: ${startDate} - end: ${endDate}`);
        // console.log(`filter: ${filter.join(" AND ")}`);
      }

      const searchOptions: any = {
        filter: filter.join(" AND "),
        attributesToSearchOn: searchKeyword ? [field] : [],
        attributesToRetrieve: ["scrapId"],
        sort: ["reportedAt:desc"],
        page: Number(page) || 1,
        hitsPerPage: Number(pageSize) || 25, //pageSize
      };

      const searchResult = await index.search(searchKeyword, searchOptions);

      const scrapIds = searchResult.hits.map((hit: any) => hit.scrapId);
      if (scrapIds.length === 0) {
        return {
          message: "No scrap reports found",
          data: [],
          totalScrapReports: 0,
          totalPages: 0,
          currentPage: page,
        };
      }

      //query db
      const options = scrapReportRepository.buildScrapReportOptions({
        whereCondition: { scrapId: { [Op.in]: scrapIds } },
      });
      const { rows } = await ScrapReport.findAndCountAll(options);

      // Sắp xếp lại thứ tự của SQL theo đúng thứ tự của Meilisearch
      const finalData = scrapIds
        .map((id) => rows.find((scrap) => scrap.scrapId === id))
        .filter(Boolean);

      return {
        message: "Get scrap reports from Meilisearch & DB successfully",
        data: finalData,
        totalScrapReports: searchResult.totalHits,
        totalPages: searchResult.totalPages,
        currentPage: searchResult.page,
      };
    } catch (error) {
      console.error("❌ get scrap reports by field failed:", error);
      throw AppError.ServerError();
    }
  },

  createScrapReport: async ({
    scrapData,
    wasteNormField,
  }: {
    scrapData: any;
    wasteNormField: {
      machine: string;
      shiftManagement: String;
      dayCompleted: Date;
      shiftProduction: "Ca 1" | "Ca 2" | "Ca 3";
    };
  }) => {
    const {
      qtyProduction = 0,
      qtyForklift = 0,
      qtyInventory = 0,
      qtyCoreTube = 0,
      qtyOther = 0,
    } = scrapData;

    try {
      return await runInTransaction(async (transaction) => {
        if (!wasteNormField.shiftProduction || !wasteNormField.machine) {
          throw AppError.BadRequest("Missing required parameters", "MISSING_PARAMETERS");
        }

        const totalQtyScrap = qtyProduction + qtyForklift + qtyInventory + qtyCoreTube + qtyOther;
        const response = await ScrapReport.create(
          {
            totalQtyScrap,
            reportedAt: new Date(),
            dayCompleted: wasteNormField.dayCompleted,
            reportedBy: wasteNormField.shiftManagement,
            machine: wasteNormField.machine,
            shiftProduction: wasteNormField.shiftProduction,
            ...scrapData,
          },
          { transaction },
        );

        //--------------------MEILISEARCH-----------------------
        const newScrap = await scrapReportRepository.syncScrapReportToMeili({
          scrapId: response.scrapId,
          transaction,
        });

        if (newScrap) {
          const flattenScrapReport = meiliTransformer.scrapReport(newScrap);
          await meiliService.syncOrUpdateMeiliData({
            indexKey: MEILI_INDEX.SCRAP_REPORTS,
            data: flattenScrapReport,
            transaction,
          });
        }

        return { message: "Scrap report created successfully", data: response };
      });
    } catch (error) {
      console.error("Error create scrap report:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  updateScrapReport: async ({
    scrapId,
    updateData,
    wasteNormField,
  }: {
    scrapId: number;
    updateData: any;
    wasteNormField: {
      machine: string;
      shiftManagement: String;
      dayCompleted: Date;
      shiftProduction: "Ca 1" | "Ca 2" | "Ca 3";
    };
  }) => {
    const {
      qtyProduction = 0,
      qtyForklift = 0,
      qtyInventory = 0,
      qtyCoreTube = 0,
      qtyOther = 0,
    } = updateData;

    try {
      return await runInTransaction(async (transaction) => {
        if (!wasteNormField.shiftProduction || !wasteNormField.machine) {
          throw AppError.BadRequest("Missing required parameters", "MISSING_PARAMETERS");
        }

        const scrapReport = await ScrapReport.findByPk(scrapId, { transaction });
        if (!scrapReport) {
          throw AppError.BadRequest("Scrap report not found", "SCRAP_REPORT_NOT_FOUND");
        }

        const totalQtyScrap = qtyProduction + qtyForklift + qtyInventory + qtyCoreTube + qtyOther;
        const response = await scrapReport.update(
          {
            totalQtyScrap,
            machine: wasteNormField.machine,
            reportedBy: wasteNormField.shiftManagement,
            dayCompleted: wasteNormField.dayCompleted,
            shiftProduction: wasteNormField.shiftProduction,
            rejectReason: "",
            status: "pending",
            ...updateData,
          },
          { transaction },
        );

        //--------------------MEILISEARCH-----------------------
        const scrapUpdated = await scrapReportRepository.syncScrapReportToMeili({
          scrapId: response.scrapId,
          transaction,
        });

        if (scrapUpdated) {
          const flattenScrapReport = meiliTransformer.scrapReport(scrapUpdated);
          await meiliService.syncOrUpdateMeiliData({
            indexKey: MEILI_INDEX.SCRAP_REPORTS,
            data: flattenScrapReport,
            isUpdate: true,
            transaction,
          });
        }

        return { message: "Scrap report updated successfully", data: response };
      });
    } catch (error) {
      console.error("Error update scrap report:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  confirmOrRejectScrapReport: async ({
    scrapId,
    status,
    rejectReason,
  }: {
    scrapId: number[];
    status: "confirmed" | "rejected";
    rejectReason?: string;
  }) => {
    try {
      return await runInTransaction(async (transaction) => {
        const scrapReports = await ScrapReport.findAll({
          where: { scrapId: { [Op.in]: scrapId } },
          attributes: { exclude: ["createdAt", "updatedAt"] },
          transaction,
        });

        if (scrapReports.length === 0) {
          throw AppError.BadRequest("Scrap reports not found", "SCRAP_REPORTS_NOT_FOUND");
        }

        const isAllPending = scrapReports.every((r) => r.status === "pending");
        if (!isAllPending) {
          throw AppError.BadRequest(
            "Chỉ có thể xác nhận báo cáo đang chờ kiểm tra",
            "INVALID_SCRAP_REPORT_STATUS",
          );
        }

        await ScrapReport.update(
          { status: status, rejectReason: rejectReason },
          { where: { scrapId: { [Op.in]: scrapId } }, transaction },
        );

        //--------------------MEILISEARCH-----------------------
        await scrapReportService.syncMeiliUpdateStatusScrapReport(scrapId, transaction);

        return { message: `Scrap reports ${status} successfully` };
      });
    } catch (error) {
      console.error(`❌ ${status} scrap report failed:`, error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  allocateScrapReport: async ({
    scrapId,
    machine,
    dayCompleted,
    shiftProduction,
  }: {
    scrapId: number[];
    machine: string;
    dayCompleted: Date;
    shiftProduction: "Ca 1" | "Ca 2" | "Ca 3";
  }) => {
    try {
      return await runInTransaction(async (transaction) => {
        const scrapReports = await ScrapReport.findAll({
          where: { scrapId: { [Op.in]: scrapId } },
          attributes: { exclude: ["createdAt", "updatedAt"] },
          transaction,
        });
        if (scrapReports.length === 0) {
          throw AppError.BadRequest("Scrap reports not found", "SCRAP_REPORTS_NOT_FOUND");
        }

        const isAllConfirmed = scrapReports.every((r) => r.status === "confirmed");
        if (!isAllConfirmed) {
          throw AppError.BadRequest(
            "Chỉ có thể phân bổ báo cáo đã được xác nhận",
            "INVALID_SCRAP_REPORT_STATUS",
          );
        }

        const dateStr = dayjsUtc(dayCompleted).format("YYYY-MM-DD");
        const startDay = dayjsUtc.utc(dateStr).startOf("day").toDate();
        const endDay = dayjsUtc.utc(dateStr).endOf("day").toDate();

        const missingScrap = await ScrapReport.findOne({
          where: {
            machine,
            dayCompleted: { [Op.between]: [startDay, endDay] },
            shiftProduction,
            status: "confirmed",
            scrapId: { [Op.notIn]: scrapId },
          },
          transaction,
        });

        if (missingScrap) {
          throw AppError.BadRequest(
            "Có báo cáo phế liệu cùng ca chưa được chọn. Vui lòng chọn đầy đủ để phân bổ!",
            "MISSING_SCRAP_REPORTS_IN_BATCH",
          );
        }

        const totalQtyScrap = scrapReports.reduce(
          (sum, r) => sum + Number(r.qtyProduction || 0),
          0,
        );

        await scrapReportService.reportWasteNormPaper({
          machine,
          dayCompleted,
          shiftProduction,
          qtyWasteNorm: totalQtyScrap,
          transaction,
        });

        await ScrapReport.update(
          { status: "allocated" },
          { where: { scrapId: { [Op.in]: scrapId } }, transaction },
        );

        //--------------------MEILISEARCH-----------------------
        await scrapReportService.syncMeiliUpdateStatusScrapReport(scrapId, transaction);

        return { message: `Scrap reports allocated successfully` };
      });
    } catch (error) {
      console.error("❌ allocate scrap report failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  //helper to report waste norm paper
  reportWasteNormPaper: async ({
    machine,
    dayCompleted,
    shiftProduction,
    qtyWasteNorm,
    transaction,
  }: {
    machine: string;
    dayCompleted: Date;
    shiftProduction: "Ca 1" | "Ca 2" | "Ca 3";
    qtyWasteNorm: number;
    transaction?: Transaction;
  }) => {
    try {
      const plannings = await manufactureRepo.getPlanningByDateAndShift({
        machine,
        dayCompleted,
        shiftProduction,
        transaction,
      });

      if (plannings.length === 0) {
        throw AppError.NotFound(
          "No production reports found for this date and shift",
          "REPORTS_NOT_FOUND",
        );
      }

      const planningIds = plannings.map((p) => p.planningId);
      const allReports = await reportRepository.getReportPaperByIds(planningIds, transaction);

      // Nhóm các report theo planningId
      const reportsGroupedByPlanning = new Map<number, any[]>();
      allReports.forEach((r) => {
        if (!reportsGroupedByPlanning.has(r.planningId)) {
          reportsGroupedByPlanning.set(r.planningId, []);
        }
        reportsGroupedByPlanning.get(r.planningId)!.push(r);
      });

      reportsGroupedByPlanning.forEach((reportList) => {
        reportList.sort((a, b) => b.reportPaperId - a.reportPaperId);
      });

      let remainingWaste = Math.round(Number(qtyWasteNorm) * 100) / 100;
      const totalItems = plannings.length;
      const dbUpdatePromises: Promise<any>[] = [];

      // phân bổ phế liệu
      for (let i = 0; i < totalItems; i++) {
        const planning = plannings[i];
        const pId = planning.planningId;

        // Tìm các Report của planning này
        const planningReports = reportsGroupedByPlanning.get(pId) || [];
        const latestReport = planningReports[0];

        // Tính tổng số phế liệu ĐÃ ĐƯỢC PHÂN BỔ ở các ca trước (loại trừ report hiện tại)
        const alreadyAllocated = planningReports
          .filter((r) => r.reportPaperId !== latestReport?.reportPaperId)
          .reduce((sum, r) => sum + Number(r.qtyWasteNorm || 0), 0);

        // Tính định mức còn lại có thể phân bổ (Ví dụ: 30 - 19 = 11)
        const norm = Number(planning.totalLoss || 0);
        const availableNorm = Math.max(0, norm - alreadyAllocated);

        let allocatedWaste = 0;

        i === totalItems - 1
          ? (allocatedWaste = remainingWaste) // nếu là đơn cuối thì ôm toàn bộ số lượng phế liệu
          : (allocatedWaste = Math.round(Math.min(remainingWaste, availableNorm) * 100) / 100);

        remainingWaste = Math.round((remainingWaste - allocatedWaste) * 100) / 100;
        if (remainingWaste < 0) remainingWaste = 0;

        // Nếu tìm thấy report của ca này, cập nhật số lượng phế liệu đã phân bổ vào report
        if (latestReport) {
          latestReport.qtyWasteNorm = allocatedWaste;
          dbUpdatePromises.push(latestReport.save({ transaction }));
        }

        // Tính tổng phế liệu tích lũy của công đoạn này
        const totalQtyWaste =
          Math.round(
            planningReports.reduce((sum, r) => sum + Number(r.qtyWasteNorm || 0), 0) * 100,
          ) / 100;

        dbUpdatePromises.push(planning.update({ qtyWasteNorm: totalQtyWaste }, { transaction }));
      }

      if (dbUpdatePromises.length > 0) {
        await Promise.all(dbUpdatePromises);
      }
    } catch (error) {
      console.error("Error add Report waste norm paper:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  //sync meili update status scrap report
  syncMeiliUpdateStatusScrapReport: async (scrapIds: number[], transaction: Transaction) => {
    try {
      const scrapUpdated = await scrapReportRepository.syncAllScrapReportForMeili({
        whereCondition: { scrapId: { [Op.in]: scrapIds } },
        transaction,
      });

      if (scrapUpdated) {
        const flattenScrapReport = scrapUpdated.map(meiliTransformer.scrapReport);
        await meiliService.syncOrUpdateMeiliData({
          indexKey: MEILI_INDEX.SCRAP_REPORTS,
          data: flattenScrapReport,
          isUpdate: true,
          transaction,
        });
      }
    } catch (error) {
      console.error("Error syncing Meili update status scrap report:", error);
      throw AppError.ServerError();
    }
  },

  deleteScrapReport: async ({ scrapId }: { scrapId: number }) => {
    try {
      return await runInTransaction(async (transaction) => {
        const scrapReport = await ScrapReport.findByPk(scrapId, { transaction });
        if (!scrapReport) {
          throw AppError.BadRequest("Scrap report not found", "SCRAP_REPORT_NOT_FOUND");
        }

        await scrapReport.destroy({ transaction });
        return { message: "Scrap report deleted successfully" };
      });
    } catch (error) {
      console.error("Error delete scrap report:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  exportExcelScrapReports: async (res: Response, { fromDate, toDate }: any, userName: string) => {},
};
