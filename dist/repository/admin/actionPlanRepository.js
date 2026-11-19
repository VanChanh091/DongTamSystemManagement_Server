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
    // TỐI ƯU 1: Gom nhóm doanh thu theo tháng ngay tại SQL (tận dụng idx_outbound_summary_by_year)
    // Lưu ý: Nếu DB của bạn lưu dateOutbound theo giờ VN sẵn (không phải UTC), đổi thành fn("MONTH", col("dateOutbound"))
    getOutboundRevenueByMonth: async (startDate, endDate) => {
        return (await outboundHistory_1.OutboundHistory.findAll({
            attributes: [
                [(0, sequelize_1.fn)("MONTH", (0, sequelize_1.fn)("DATE_ADD", (0, sequelize_1.col)("dateOutbound"), (0, sequelize_1.literal)("INTERVAL 7 HOUR"))), "month"],
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("totalPricePayment")), "totalRevenue"],
            ],
            where: { dateOutbound: { [sequelize_1.Op.between]: [startDate, endDate] } },
            group: ["month"],
            raw: true,
        }));
    },
    // TỐI ƯU 2: Gom nhóm tổng phút chạy thực tế theo tháng ngay tại SQL
    getDailyReportDurationsByMonth: async (startDateStr, endDateStr) => {
        return (await dailyReportPerformance_1.DailyReportPerformance.findAll({
            attributes: [
                [(0, sequelize_1.fn)("MONTH", (0, sequelize_1.col)("dayReport")), "month"],
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("totalDurations")), "totalDurations"],
            ],
            where: { dayReport: { [sequelize_1.Op.between]: [startDateStr, endDateStr] } },
            group: [(0, sequelize_1.fn)("MONTH", (0, sequelize_1.col)("dayReport"))],
            raw: true,
        }));
    },
    // TỐI ƯU 3: Bỏ nest: true và bỏ các cột thừa (planningId, Order.orderId, Order.status)
    getPlanningPapersForYear: async (startDate, endDate) => {
        return await planningPaper_1.PlanningPaper.findAll({
            attributes: ["orderId", "dayStart", "dayCompleted", "timeStart", "timeRunning", "status"],
            include: [
                {
                    model: order_1.Order,
                    attributes: ["dateRequestShipping"],
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
        });
    },
    // SỬA LỖI LOGIC: Lấy các orderId còn phiếu chưa xếp lịch (dayStart & dayCompleted đều null)
    // Tránh việc đơn có 2 phiếu (1 phiếu xong trong năm, 1 phiếu chưa xếp lịch) bị tính nhầm là đã hoàn thành
    getUnscheduledIncompleteOrderIds: async () => {
        const rows = (await planningPaper_1.PlanningPaper.findAll({
            attributes: [[(0, sequelize_1.fn)("DISTINCT", (0, sequelize_1.col)("orderId")), "orderId"]],
            where: {
                status: { [sequelize_1.Op.notIn]: ["complete", "cancel"] },
                dayStart: { [sequelize_1.Op.is]: null },
                dayCompleted: { [sequelize_1.Op.is]: null },
            },
            raw: true,
        }));
        return new Set(rows.map((r) => r.orderId));
    },
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