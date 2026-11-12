import { Op } from "sequelize";
import { ScrapReport } from "../models/scrap/scrapReport";
import { dayjsUtc } from "../assets/configs/dayjs/dayjs.config";
import { Order } from "../models/order/order";
import { PlanningPaper } from "../models/planning/planningPaper";
import { ReportPlanningPaper } from "../models/report/reportPlanningPaper";
import { PaperRequirements } from "../models/planning/requirement/paperRequirements";
import { QcInspectionPaper } from "../models/qualityControl/inspection/qcInspectionPaper";
import { PRODUCTION_ACTIVE_ORDER_STATUSES } from "../utils/helper/modelHelper/productionRevenueRule";

const VN_TZ = "Asia/Ho_Chi_Minh";
const PLANNING_ID_BATCH_SIZE = 1000;

interface QueryExecutionOptions {
  raw?: boolean;
  nest?: boolean;
}

export interface RawProductionReportPaperRow {
  reportPaperId: number;
  planningId: number;
  qtyProduced: number;
  totalPrice: number | string;
  totalLength: number | string;
  durations: number | string;
  averageSpeed: number | string;
  shiftProduction: string;
  shiftManagement: string;
  reportedBy: string;
  dayReport: Date | string;
  PlanningPaper?: {
    planningId: number;
    chooseMachine: string;
    runningPlan: number;
    plannedDuration: number;
    Order?: {
      isBox: boolean | number;
      status: string;
    };
  };
}

export interface RawQcErrorRow {
  planningId: number;
  inspecPaperId: number;
  timeInspection: Date | string;
}

export const productionReportRepository = {
  // Lấy tất cả báo cáo giấy tấm trong khung giờ sản xuất
  getProductionReportPapers: async ({
    startDateTime,
    endDateTime,
    filterMachine,
    filterWorker,
    raw = true,
    nest = true,
  }: {
    startDateTime: Date;
    endDateTime: Date;
    filterMachine?: string;
    filterWorker?: string;
  } & QueryExecutionOptions): Promise<RawProductionReportPaperRow[]> => {
    const wherePlanning: any = {};
    if (filterMachine) wherePlanning.chooseMachine = filterMachine;

    const whereReport: any = { dayReport: { [Op.between]: [startDateTime, endDateTime] } };
    if (filterWorker) whereReport.shiftManagement = filterWorker;

    return (await ReportPlanningPaper.findAll({
      where: whereReport,
      attributes: [
        "reportPaperId",
        "planningId",
        "qtyProduced",
        "totalPrice",
        "totalLength",
        "durations",
        "averageSpeed",
        "shiftProduction",
        "shiftManagement",
        "reportedBy",
        "dayReport",
      ],
      include: [
        {
          model: PlanningPaper,
          where: Object.keys(wherePlanning).length ? wherePlanning : undefined,
          attributes: ["planningId", "chooseMachine", "runningPlan", "plannedDuration"],
          required: true,
          include: [
            {
              model: Order,
              attributes: ["isBox", "status"],
              where: {
                status: { [Op.in]: [...PRODUCTION_ACTIVE_ORDER_STATUSES] },
              },
              required: true,
            },
          ],
        },
      ],
      order: [["dayReport", "ASC"]],
      raw,
      nest,
    })) as unknown as RawProductionReportPaperRow[];
  },

  // Lấy định mức giấy của các planningId tương ứng (chia batch tránh query IN quá lớn)
  getPaperRequirementsByPlanningIds: async ({
    planningIds,
    options,
  }: {
    planningIds: number[];
    options?: QueryExecutionOptions;
  }) => {
    if (planningIds.length === 0) return [];

    const results = [];
    for (let i = 0; i < planningIds.length; i += PLANNING_ID_BATCH_SIZE) {
      const batchIds = planningIds.slice(i, i + PLANNING_ID_BATCH_SIZE);
      const batch = await PaperRequirements.findAll({
        where: { planningId: { [Op.in]: batchIds } },
        attributes: ["planningId", "totalRequiredQty"],
        raw: true,
        nest: options?.nest,
      });
      results.push(...batch);
    }

    return results;
  },

  // Lấy phế liệu trong khung giờ sản xuất
  getScrapReportsByDateRange: async ({
    startDateTime,
    endDateTime,
    filterMachine,
    filterWorker,
    raw = true,
    nest,
  }: {
    startDateTime: Date;
    endDateTime: Date;
    filterMachine?: string;
    filterWorker?: string;
  } & QueryExecutionOptions) => {
    const whereClause: any = {
      dayCompleted: { [Op.between]: [startDateTime, endDateTime] },
      status: { [Op.ne]: "rejected" },
    };
    if (filterMachine) whereClause.machine = filterMachine;
    if (filterWorker) whereClause.reportedBy = filterWorker;

    return await ScrapReport.findAll({
      where: whereClause,
      attributes: ["machine", "reportedBy", "totalQtyScrap", "dayCompleted"],
      raw,
      nest,
    });
  },

  // Lấy danh sách kiểm tra QC không đạt kèm thời điểm timeInspection (chia batch tránh query IN quá lớn)
  getQcErrorsByPlanningIds: async ({
    planningIds,
    options,
  }: {
    planningIds: number[];
    options?: QueryExecutionOptions;
  }): Promise<RawQcErrorRow[]> => {
    if (planningIds.length === 0) return [];

    const results: RawQcErrorRow[] = [];
    for (let i = 0; i < planningIds.length; i += PLANNING_ID_BATCH_SIZE) {
      const batchIds = planningIds.slice(i, i + PLANNING_ID_BATCH_SIZE);
      const batch = (await QcInspectionPaper.findAll({
        where: { planningId: { [Op.in]: batchIds }, result: false },
        attributes: ["planningId", "inspecPaperId", "timeInspection"],
        raw: true,
        nest: options?.nest,
      })) as unknown as RawQcErrorRow[];
      results.push(...batch);
    }

    return results;
  },

  // Lấy tổng phút kế hoạch được giao cho máy theo ngày kế hoạch dayStart
  getMachinePlannedDurations: async ({
    startDate,
    endDate,
    filterMachine,
    raw = true,
    nest,
  }: {
    startDate: string;
    endDate: string;
    filterMachine?: string;
  } & QueryExecutionOptions) => {
    // Đầu ngày startDate và cuối ngày endDate theo giờ VN
    const startDateTime = dayjsUtc.tz(startDate, VN_TZ).startOf("day").toDate();
    const endDateTime = dayjsUtc.tz(endDate, VN_TZ).endOf("day").toDate();

    const whereClause: any = {
      dayStart: { [Op.between]: [startDateTime, endDateTime] },
      status: { [Op.ne]: "cancel" },
    };
    if (filterMachine) whereClause.chooseMachine = filterMachine;

    return await PlanningPaper.findAll({
      where: whereClause,
      attributes: ["chooseMachine", "plannedDuration", "dayStart"],
      raw,
      nest,
    });
  },
};
