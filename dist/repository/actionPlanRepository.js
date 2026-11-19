"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.actionPlanRepository = void 0;
const sequelize_1 = require("sequelize");
const order_1 = require("../models/order/order");
const planningPaper_1 = require("../models/planning/planningPaper");
const timeOverflowPlanning_1 = require("../models/planning/timeOverflowPlanning");
const actionPlanTarget_1 = require("../models/admin/actionPlan/actionPlanTarget");
const dailyReportPerformance_1 = require("../models/report/dailyReportPerformance");
const actionPlanDebtSnapshot_1 = require("../models/admin/actionPlan/actionPlanDebtSnapshot");
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
    // Lấy toàn bộ đơn hàng trong năm
    getOrdersForYear: async (startDate, endDate) => {
        return await order_1.Order.findAll({
            attributes: [
                "orderId",
                "dayReceiveOrder",
                "dateRequestShipping",
                "dayApproved",
                "totalPrice",
                "totalPriceVAT",
                "status",
            ],
            include: [
                {
                    model: planningPaper_1.PlanningPaper,
                    attributes: ["planningId", "dayCompleted"],
                    required: false,
                },
            ],
            where: {
                status: { [sequelize_1.Op.in]: ["accept", "planning", "completed"] },
                dayReceiveOrder: { [sequelize_1.Op.between]: [startDate, endDate] },
            },
            raw: true,
            nest: true,
        });
    },
    // Lấy toàn bộ báo cáo hiệu suất sản xuất trong năm
    getDailyReportPerformanceForYear: async (startDateStr, endDateStr) => {
        return await dailyReportPerformance_1.DailyReportPerformance.findAll({
            attributes: ["dayReport", "totalDurations"],
            where: {
                dayReport: {
                    [sequelize_1.Op.between]: [startDateStr, endDateStr],
                },
            },
            raw: true,
        });
    },
    // Lấy toàn bộ thời gian trễ máy trong năm
    getTimeOverflowForYear: async (startDate, endDate) => {
        return await timeOverflowPlanning_1.timeOverflowPlanning.findAll({
            attributes: ["overflowDayStart", "overflowTimeRunning"],
            where: { overflowDayStart: { [sequelize_1.Op.between]: [startDate, endDate] } },
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