import { Op } from "sequelize";
import { Order } from "../../models/order/order";
import { PlanningPaper } from "../../models/planning/planningPaper";
import { timeOverflowPlanning } from "../../models/planning/timeOverflowPlanning";
import { ActionPlanTarget } from "../../models/admin/actionPlan/actionPlanTarget";
import { DailyReportPerformance } from "../../models/report/dailyReportPerformance";
import { ActionPlanDebtSnapshot } from "../../models/admin/actionPlan/actionPlanDebtSnapshot";
import { OutboundHistory } from "../../models/warehouse/outbound/outboundHistory";

export const actionPlanRepository = {
  // Lấy danh sách mục tiêu năm đã cấu hình
  getTargetsByYear: async (year: number) => {
    return await ActionPlanTarget.findAll({
      where: { year },
      attributes: [
        "month",
        "targetRevenue",
        "targetDebtOnTimeRate",
        "targetOrderOnTimeRate",
        "targetProductionCompletionRate",
        "note",
      ],
      order: [["month", "ASC"]],
      raw: true,
    });
  },

  // Lấy toàn bộ PXK xuất trong năm
  getOutboundsForYear: async (startDate: Date, endDate: Date) => {
    return await OutboundHistory.findAll({
      attributes: ["outboundId", "dateOutbound", "totalPricePayment"],
      where: { dateOutbound: { [Op.between]: [startDate, endDate] } },
      raw: true,
    });
  },

  // Lấy phiếu kế hoạch phát sinh hoặc hoàn thành trong năm
  getPlanningPapersForYear: async (startDate: Date, endDate: Date) => {
    return await PlanningPaper.findAll({
      attributes: [
        "planningId",
        "orderId",
        "dayStart",
        "dayCompleted",
        "timeStart",
        "timeRunning",
        "status",
      ],
      include: [
        {
          model: Order,
          attributes: ["orderId", "dateRequestShipping", "status"],
          required: true,
        },
      ],
      where: {
        status: { [Op.ne]: "cancel" },
        [Op.or]: [
          { dayStart: { [Op.between]: [startDate, endDate] } },
          { dayCompleted: { [Op.between]: [startDate, endDate] } },
        ],
      },
      raw: true,
      nest: true,
    });
  },

  // Lấy tổng thời gian chạy thực tế theo báo cáo ngày
  getDailyReportPerformanceForYear: async (startDateStr: string, endDateStr: string) => {
    return await DailyReportPerformance.findAll({
      attributes: ["dayReport", "totalDurations"],
      where: { dayReport: { [Op.between]: [startDateStr, endDateStr] } },
      raw: true,
    });
  },

  // Lấy toàn bộ snapshot công nợ đã chốt trong năm
  getDebtSnapshotsByYear: async (year: number) => {
    return await ActionPlanDebtSnapshot.findAll({
      where: { year },
      attributes: ["month", "closingDay", "totalDebt", "overdueDebt", "onTimeDebt", "onTimeRate"],
      order: [
        ["month", "ASC"],
        ["closingDay", "ASC"],
      ],
      raw: true,
    });
  },
};
