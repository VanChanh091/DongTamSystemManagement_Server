import { Op } from "sequelize";
import { ScrapReport } from "../models/scrap/scrapReport";
import { dayjsUtc } from "../assets/configs/dayjs/dayjs.config";
import { PlanningPaper } from "../models/planning/planningPaper";
import { ReportPlanningPaper } from "../models/report/reportPlanningPaper";
import { PaperRequirements } from "../models/planning/requirement/paperRequirements";
import { QcInspectionPaper } from "../models/qualityControl/inspection/qcInspectionPaper";

const VN_TZ = "Asia/Ho_Chi_Minh";

export const productionReportRepository = {
  // Lấy tất cả báo cáo giấy tấm trong khung giờ sản xuất
  getProductionReportPapers: async ({
    startDateTime,
    endDateTime,
  }: {
    startDateTime: Date;
    endDateTime: Date;
  }) => {
    return await ReportPlanningPaper.findAll({
      where: { dayReport: { [Op.between]: [startDateTime, endDateTime] } },
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
      ],
      include: [
        {
          model: PlanningPaper,
          attributes: ["planningId", "chooseMachine", "runningPlan", "plannedDuration", "dayStart"],
        },
      ],
      order: [["dayReport", "ASC"]],
    });
  },

  //  Lấy định mức giấy của các planningId tương ứng
  getPaperRequirementsByPlanningIds: async (planningIds: number[]) => {
    if (planningIds.length === 0) return [];

    return await PaperRequirements.findAll({
      where: { planningId: { [Op.in]: planningIds } },
      attributes: ["planningId", "totalRequiredQty"],
      raw: true,
    });
  },

  // Lấy phế liệu trong khung giờ sản xuất
  getScrapReportsByDateRange: async ({
    startDateTime,
    endDateTime,
  }: {
    startDateTime: Date;
    endDateTime: Date;
  }) => {
    return await ScrapReport.findAll({
      where: {
        dayCompleted: { [Op.between]: [startDateTime, endDateTime] },
        status: { [Op.ne]: "rejected" },
      },
      attributes: ["machine", "reportedBy", "totalQtyScrap"],
      raw: true,
    });
  },

  // Lấy danh sách kiểm tra QC không đạt
  getQcErrorsByPlanningIds: async (planningIds: number[]) => {
    if (planningIds.length === 0) return [];

    return await QcInspectionPaper.findAll({
      where: { planningId: { [Op.in]: planningIds }, result: false },
      attributes: ["planningId", "inspecPaperId"],
      raw: true,
    });
  },

  // Lấy tổng phút kế hoạch được giao cho máy theo ngày kế hoạch dayStart
  getMachinePlannedDurations: async ({
    startDate,
    endDate,
  }: {
    startDate: string;
    endDate: string;
  }) => {
    // Đầu ngày startDate và cuối ngày endDate theo giờ VN
    const startDateTime = dayjsUtc.tz(startDate, VN_TZ).startOf("day").toDate();
    const endDateTime = dayjsUtc.tz(endDate, VN_TZ).endOf("day").toDate();

    return await PlanningPaper.findAll({
      where: {
        dayStart: { [Op.between]: [startDateTime, endDateTime] },
        status: { [Op.ne]: "cancel" },
      },
      attributes: ["chooseMachine", "plannedDuration"],
      raw: true,
    });
  },
};
