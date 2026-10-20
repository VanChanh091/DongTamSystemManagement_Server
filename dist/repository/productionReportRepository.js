"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productionReportRepository = void 0;
const sequelize_1 = require("sequelize");
const scrapReport_1 = require("../models/scrap/scrapReport");
const dayjs_config_1 = require("../assets/configs/dayjs/dayjs.config");
const planningPaper_1 = require("../models/planning/planningPaper");
const reportPlanningPaper_1 = require("../models/report/reportPlanningPaper");
const paperRequirements_1 = require("../models/planning/requirement/paperRequirements");
const qcInspectionPaper_1 = require("../models/qualityControl/inspection/qcInspectionPaper");
const VN_TZ = "Asia/Ho_Chi_Minh";
exports.productionReportRepository = {
    // Lấy tất cả báo cáo giấy tấm trong khung giờ sản xuất
    getProductionReportPapers: async ({ startDateTime, endDateTime, }) => {
        return await reportPlanningPaper_1.ReportPlanningPaper.findAll({
            where: { dayReport: { [sequelize_1.Op.between]: [startDateTime, endDateTime] } },
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
                    attributes: ["planningId", "chooseMachine", "runningPlan", "plannedDuration", "dayStart"],
                },
            ],
            order: [["dayReport", "ASC"]],
        });
    },
    //  Lấy định mức giấy của các planningId tương ứng
    getPaperRequirementsByPlanningIds: async (planningIds) => {
        if (planningIds.length === 0)
            return [];
        return await paperRequirements_1.PaperRequirements.findAll({
            where: { planningId: { [sequelize_1.Op.in]: planningIds } },
            attributes: ["planningId", "totalRequiredQty"],
            raw: true,
        });
    },
    // Lấy phế liệu trong khung giờ sản xuất
    getScrapReportsByDateRange: async ({ startDateTime, endDateTime, }) => {
        return await scrapReport_1.ScrapReport.findAll({
            where: {
                dayCompleted: { [sequelize_1.Op.between]: [startDateTime, endDateTime] },
                status: { [sequelize_1.Op.ne]: "rejected" },
            },
            attributes: ["machine", "reportedBy", "totalQtyScrap"],
            raw: true,
        });
    },
    // Lấy danh sách kiểm tra QC không đạt kèm thời điểm timeInspection
    getQcErrorsByPlanningIds: async (planningIds) => {
        if (planningIds.length === 0)
            return [];
        return await qcInspectionPaper_1.QcInspectionPaper.findAll({
            where: { planningId: { [sequelize_1.Op.in]: planningIds }, result: false },
            attributes: ["planningId", "inspecPaperId", "timeInspection"],
            raw: true,
        });
    },
    // Lấy tổng phút kế hoạch được giao cho máy theo ngày kế hoạch dayStart
    getMachinePlannedDurations: async ({ startDate, endDate, }) => {
        // Đầu ngày startDate và cuối ngày endDate theo giờ VN
        const startDateTime = dayjs_config_1.dayjsUtc.tz(startDate, VN_TZ).startOf("day").toDate();
        const endDateTime = dayjs_config_1.dayjsUtc.tz(endDate, VN_TZ).endOf("day").toDate();
        return await planningPaper_1.PlanningPaper.findAll({
            where: {
                dayStart: { [sequelize_1.Op.between]: [startDateTime, endDateTime] },
                status: { [sequelize_1.Op.ne]: "cancel" },
            },
            attributes: ["chooseMachine", "plannedDuration"],
            raw: true,
        });
    },
};
//# sourceMappingURL=productionReportRepository.js.map