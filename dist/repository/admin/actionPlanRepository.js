"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.actionPlanRepository = void 0;
const sequelize_1 = require("sequelize");
const order_1 = require("../../models/order/order");
const planningPaper_1 = require("../../models/planning/planningPaper");
const actionPlanTarget_1 = require("../../models/admin/actionPlan/actionPlanTarget");
const dailyReportPerformance_1 = require("../../models/report/dailyReportPerformance");
const actionPlanDebtSnapshot_1 = require("../../models/admin/actionPlan/actionPlanDebtSnapshot");
const outboundHistory_1 = require("../../models/warehouse/outbound/outboundHistory");
exports.actionPlanRepository = {
    // Lấy danh sách mục tiêu năm đã cấu hình
    getTargetsByYear: async (year) => {
        return await actionPlanTarget_1.ActionPlanTarget.findAll({
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
    getOutboundsForYear: async (startDate, endDate) => {
        return await outboundHistory_1.OutboundHistory.findAll({
            attributes: ["outboundId", "dateOutbound", "totalPricePayment"],
            where: { dateOutbound: { [sequelize_1.Op.between]: [startDate, endDate] } },
            raw: true,
        });
    },
    // Lấy phiếu kế hoạch phát sinh hoặc hoàn thành trong năm
    getPlanningPapersForYear: async (startDate, endDate) => {
        return await planningPaper_1.PlanningPaper.findAll({
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
                    model: order_1.Order,
                    attributes: ["orderId", "dateRequestShipping", "status"],
                    required: true,
                },
            ],
            where: {
                status: { [sequelize_1.Op.ne]: "cancel" },
                [sequelize_1.Op.or]: [
                    { dayStart: { [sequelize_1.Op.between]: [startDate, endDate] } },
                    { dayCompleted: { [sequelize_1.Op.between]: [startDate, endDate] } },
                ],
            },
            raw: true,
            nest: true,
        });
    },
    // Lấy tổng thời gian chạy thực tế theo báo cáo ngày
    getDailyReportPerformanceForYear: async (startDateStr, endDateStr) => {
        return await dailyReportPerformance_1.DailyReportPerformance.findAll({
            attributes: ["dayReport", "totalDurations"],
            where: { dayReport: { [sequelize_1.Op.between]: [startDateStr, endDateStr] } },
            raw: true,
        });
    },
    // Lấy toàn bộ snapshot công nợ đã chốt trong năm
    getDebtSnapshotsByYear: async (year) => {
        return await actionPlanDebtSnapshot_1.ActionPlanDebtSnapshot.findAll({
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
//# sourceMappingURL=actionPlanRepository.js.map