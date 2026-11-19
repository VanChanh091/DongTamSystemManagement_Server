"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productionReportRepository = void 0;
const sequelize_1 = require("sequelize");
const scrapReport_1 = require("../../models/scrap/scrapReport");
const dayjs_config_1 = require("../../assets/configs/dayjs/dayjs.config");
const order_1 = require("../../models/order/order");
const planningPaper_1 = require("../../models/planning/planningPaper");
const reportPlanningPaper_1 = require("../../models/report/reportPlanningPaper");
const paperRequirements_1 = require("../../models/planning/requirement/paperRequirements");
const qcInspectionPaper_1 = require("../../models/qualityControl/inspection/qcInspectionPaper");
const productionRevenueRule_1 = require("../../utils/helper/modelHelper/productionRevenueRule");
const VN_TZ = "Asia/Ho_Chi_Minh";
const PLANNING_ID_BATCH_SIZE = 1000;
exports.productionReportRepository = {
    // Lấy tất cả báo cáo giấy tấm trong khung giờ sản xuất
    getProductionReportPapers: async ({ startDateTime, endDateTime, filterMachine, filterWorker, raw = true, nest = true, }) => {
        const wherePlanning = {};
        if (filterMachine)
            wherePlanning.chooseMachine = filterMachine;
        const whereReport = { dayReport: { [sequelize_1.Op.between]: [startDateTime, endDateTime] } };
        if (filterWorker)
            whereReport.shiftManagement = filterWorker;
        return (await reportPlanningPaper_1.ReportPlanningPaper.findAll({
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
                    model: planningPaper_1.PlanningPaper,
                    where: Object.keys(wherePlanning).length ? wherePlanning : undefined,
                    attributes: ["planningId", "chooseMachine", "runningPlan", "plannedDuration"],
                    required: true,
                    include: [
                        {
                            model: order_1.Order,
                            attributes: ["isBox", "status"],
                            where: {
                                status: { [sequelize_1.Op.in]: [...productionRevenueRule_1.PRODUCTION_ACTIVE_ORDER_STATUSES] },
                            },
                            required: true,
                        },
                    ],
                },
            ],
            order: [["dayReport", "ASC"]],
            raw,
            nest,
        }));
    },
    // Lấy định mức giấy của các planningId tương ứng (chia batch tránh query IN quá lớn)
    getPaperRequirementsByPlanningIds: async ({ planningIds, options, }) => {
        if (planningIds.length === 0)
            return [];
        const results = [];
        for (let i = 0; i < planningIds.length; i += PLANNING_ID_BATCH_SIZE) {
            const batchIds = planningIds.slice(i, i + PLANNING_ID_BATCH_SIZE);
            const batch = await paperRequirements_1.PaperRequirements.findAll({
                where: { planningId: { [sequelize_1.Op.in]: batchIds } },
                attributes: ["planningId", "totalRequiredQty"],
                raw: true,
                nest: options?.nest,
            });
            results.push(...batch);
        }
        return results;
    },
    // Lấy phế liệu trong khung giờ sản xuất
    getScrapReportsByDateRange: async ({ startDateTime, endDateTime, filterMachine, filterWorker, raw = true, nest, }) => {
        const whereClause = {
            dayCompleted: { [sequelize_1.Op.between]: [startDateTime, endDateTime] },
            status: { [sequelize_1.Op.ne]: "rejected" },
        };
        if (filterMachine)
            whereClause.machine = filterMachine;
        if (filterWorker)
            whereClause.reportedBy = filterWorker;
        return await scrapReport_1.ScrapReport.findAll({
            where: whereClause,
            attributes: ["machine", "reportedBy", "totalQtyScrap", "dayCompleted"],
            raw,
            nest,
        });
    },
    // Lấy danh sách kiểm tra QC không đạt kèm thời điểm timeInspection (chia batch tránh query IN quá lớn)
    getQcErrorsByPlanningIds: async ({ planningIds, options, }) => {
        if (planningIds.length === 0)
            return [];
        const results = [];
        for (let i = 0; i < planningIds.length; i += PLANNING_ID_BATCH_SIZE) {
            const batchIds = planningIds.slice(i, i + PLANNING_ID_BATCH_SIZE);
            const batch = (await qcInspectionPaper_1.QcInspectionPaper.findAll({
                where: { planningId: { [sequelize_1.Op.in]: batchIds }, result: false },
                attributes: ["planningId", "inspecPaperId", "timeInspection"],
                raw: true,
                nest: options?.nest,
            }));
            results.push(...batch);
        }
        return results;
    },
    // Lấy tổng phút kế hoạch được giao cho máy theo ngày kế hoạch dayStart
    getMachinePlannedDurations: async ({ startDate, endDate, filterMachine, raw = true, nest, }) => {
        // Đầu ngày startDate và cuối ngày endDate theo giờ VN
        const startDateTime = dayjs_config_1.dayjsUtc.tz(startDate, VN_TZ).startOf("day").toDate();
        const endDateTime = dayjs_config_1.dayjsUtc.tz(endDate, VN_TZ).endOf("day").toDate();
        const whereClause = {
            dayStart: { [sequelize_1.Op.between]: [startDateTime, endDateTime] },
            status: { [sequelize_1.Op.ne]: "cancel" },
        };
        if (filterMachine)
            whereClause.chooseMachine = filterMachine;
        return await planningPaper_1.PlanningPaper.findAll({
            where: whereClause,
            attributes: ["chooseMachine", "plannedDuration", "dayStart"],
            raw,
            nest,
        });
    },
};
//# sourceMappingURL=productionReportRepository.js.map