import dotenv from "dotenv";
dotenv.config();

import { Response } from "express";
import { Transaction } from "sequelize";
import { AppError } from "../utils/appError";
import { ScrapReport } from "../models/scrap/scrapReport";
import { reportRepository } from "../repository/reportRepository";
import { runInTransaction } from "../utils/helper/transactionHelper";
import { manufactureRepo } from "../repository/manufactureRepository";

export const scrapReportService = {
  getAllScrapReports: async ({ page, pageSize }: { page: number; pageSize: number }) => {
    try {
      // const { isChanged } = await CacheManager.check(
      //   [{ model: EmployeeBasicInfo }, { model: EmployeeCompanyInfo }],
      //   "employee",
      // );

      // if (isChanged) {
      //   await CacheManager.clear("employee");
      // } else {
      //   const cachedData = await redisCache.get(cacheKey);
      //   if (cachedData) {
      //     if (devEnvironment) console.log("✅ Data Employees from Redis");
      //     const parsed = JSON.parse(cachedData);
      //     return { ...parsed, message: `Get all employees from cache` };
      //   }
      // }

      const { rows, count } = await ScrapReport.findAndCountAll({
        attributes: { exclude: ["createdAt", "updatedAt"] },
        offset: (page - 1) * pageSize,
        limit: pageSize,
        order: [["scrapId", "DESC"]],
      });

      const responseData = {
        message: "Get all scrap reports successfully",
        data: rows,
        totalScrapReports: count,
        totalPages: Math.ceil(count / pageSize),
        currentPage: page,
      };
      return responseData;
    } catch (error) {
      console.error("Error get all scrap reports:", error);
      throw AppError.ServerError();
    }
  },

  getScrapReportByField: async ({
    field,
    keyword,
    page,
    pageSize,
    startDate,
    endDate,
  }: {
    field: string;
    keyword: string;
    page: number;
    pageSize: number;
    startDate?: string;
    endDate?: string;
  }) => {
    try {
    } catch (error) {
      console.error("Error get scrap report by field:", error);
      throw AppError.ServerError();
    }
  },

  createScrapReport: async ({
    empCode,
    scrapData,
    machine,
    dayCompleted,
    shiftProduction,
    qtyWasteNorm,
  }: {
    empCode: string;
    scrapData: any;
    machine: string;
    dayCompleted: Date;
    shiftProduction: "Ca 1" | "Ca 2" | "Ca 3";
    qtyWasteNorm: number;
  }) => {
    const { qtyForklift = 0, qtyInventory = 0, qtyCoreTube = 0, qtyOther = 0 } = scrapData;

    try {
      return await runInTransaction(async (transaction) => {
        const employee = await manufactureRepo.getEmployeeByCode(empCode, transaction);
        if (!employee) {
          throw AppError.NotFound("employee not found", "EMPLOYEE_NOT_FOUND");
        }

        await scrapReportService.reportWasteNormPaper(
          machine,
          dayCompleted,
          shiftProduction,
          qtyWasteNorm,
          transaction,
        );

        const totalQtyScrap = qtyForklift + qtyInventory + qtyCoreTube + qtyWasteNorm + qtyOther;
        const response = await ScrapReport.create(
          {
            qtyProduction: qtyWasteNorm,
            totalQtyScrap: totalQtyScrap,
            reportedBy: employee.fullName,
            reportedAt: new Date(),
            ...scrapData,
          },
          { transaction },
        );

        return { message: "Scrap report created successfully", data: response };
      });
    } catch (error) {
      console.error("Error create scrap report:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  reportWasteNormPaper: async (
    machine: string,
    dayCompleted: Date,
    shiftProduction: "Ca 1" | "Ca 2" | "Ca 3",
    qtyWasteNorm: number,
    transaction: Transaction,
  ) => {
    try {
      const plannings = await manufactureRepo.getPlanningByDateAndShift({
        machine,
        dayCompleted,
        shiftProduction,
        transaction,
      });

      // console.log(`length: ${plannings.length}`);
      // console.log(`plannings: ${JSON.stringify(plannings)}`);

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

        const norm = Number(planning.totalLoss || 0);
        let allocatedWaste = 0;

        if (i === totalItems - 1) {
          allocatedWaste = remainingWaste; // Thằng cuối cùng ôm trọn phần còn lại
        } else {
          allocatedWaste = Math.round(Math.min(remainingWaste, norm) * 100) / 100;
        }

        remainingWaste = Math.round((remainingWaste - allocatedWaste) * 100) / 100;
        if (remainingWaste < 0) remainingWaste = 0;

        // Tìm đúng Row Report của ca hiện tại dựa trên planningId + ngày + ca
        const planningReports = reportsGroupedByPlanning.get(pId) || [];
        const latestReport = planningReports[0];

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

  updateScrapReport: async ({ scrapId, updateData }: { scrapId: number; updateData: any }) => {
    try {
      return await runInTransaction(async (transaction) => {
        const scrapReport = await ScrapReport.findByPk(scrapId, { transaction });
        if (!scrapReport) {
          throw AppError.BadRequest("Scrap report not found", "SCRAP_REPORT_NOT_FOUND");
        }

        const totalQtyScrap =
          (updateData.qtyForklift || 0) +
          (updateData.qtyInventory || 0) +
          (updateData.qtyCoreTube || 0) +
          (updateData.qtyProduction || 0) +
          (updateData.qtyOther || 0);

        const response = await scrapReport.update(
          { totalQtyScrap: totalQtyScrap, ...updateData },
          { transaction },
        );

        return { message: "Scrap report updated successfully", data: response };
      });
    } catch (error) {
      console.error("Error update scrap report:", error);
      if (error instanceof AppError) throw error;
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
