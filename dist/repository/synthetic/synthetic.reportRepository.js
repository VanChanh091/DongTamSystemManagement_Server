"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syntheticReportRepository = void 0;
const sequelize_1 = require("sequelize");
const order_1 = require("../../models/order/order");
const customer_1 = require("../../models/customer/customer");
const orderApproved_1 = require("../../models/order/orderApproved");
const inboundHistory_1 = require("../../models/warehouse/inboundHistory");
const outboundDetail_1 = require("../../models/warehouse/outbound/outboundDetail");
const outboundHistory_1 = require("../../models/warehouse/outbound/outboundHistory");
const employeeBasicInfo_1 = require("../../models/employee/employeeBasicInfo");
const qcInspectionPaper_1 = require("../../models/qualityControl/qcInspection/qcInspectionPaper");
const planningPaper_1 = require("../../models/planning/planningPaper");
const reportPlanningPaper_1 = require("../../models/report/reportPlanningPaper");
const qcInspectionBox_1 = require("../../models/qualityControl/qcInspection/qcInspectionBox");
const planningBoxMachineTime_1 = require("../../models/planning/planningBoxMachineTime");
const reportPlanningBox_1 = require("../../models/report/reportPlanningBox");
const paperRequirements_1 = require("../../models/planning/requirement/paperRequirements");
exports.syntheticReportRepository = {
    //====================================REVENUE DAY========================================
    getRawOutboundByCustomer: async ({ startDate, endDate, userId, }) => {
        return outboundHistory_1.OutboundHistory.findAll({
            attributes: ["customerId", "dateOutbound", "totalPricePayment"],
            where: { dateOutbound: { [sequelize_1.Op.between]: [startDate, endDate] } },
            include: [
                {
                    model: customer_1.Customer,
                    required: true,
                    attributes: ["customerId", "customerName", "companyName"],
                    where: userId ? { userId } : undefined,
                },
            ],
            raw: true,
            nest: true,
        });
    },
    //====================================REVENUE MONTH======================================
    // gom nhóm theo ngày duyệt và lấy các đơn được duyệt mới nhất
    getDailyApprovedOrders: async ({ startDate, endDate, userId, }) => {
        return orderApproved_1.OrderApproved.findAll({
            attributes: ["orderId", "createdAt"],
            where: {
                action: "APPROVED",
                createdAt: { [sequelize_1.Op.between]: [startDate, endDate] },
            },
            include: [
                {
                    model: order_1.Order,
                    required: true,
                    attributes: ["totalPrice"],
                    where: {
                        ...(userId ? { userId } : {}),
                        status: { [sequelize_1.Op.in]: ["accept", "planning", "completed"] },
                    },
                },
            ],
            order: [["approverId", "DESC"]],
            raw: true,
            nest: true,
        });
    },
    //gom nhóm theo ngày nhập kho
    getDailyProductionInbound: async ({ startDate, endDate, userId, }) => {
        return inboundHistory_1.InboundHistory.findAll({
            attributes: ["totalPrice", "createdAt"],
            where: { createdAt: { [sequelize_1.Op.between]: [startDate, endDate] } },
            include: [
                {
                    model: order_1.Order,
                    required: true,
                    attributes: [],
                    where: {
                        ...(userId ? { userId } : {}),
                        status: { [sequelize_1.Op.in]: ["accept", "planning", "completed"] },
                    },
                },
            ],
            raw: true,
        });
    },
    //gom nhóm theo chi tiết xuất kho
    getDailyProductionOutbound: async ({ startDate, endDate, userId, }) => {
        return outboundDetail_1.OutboundDetail.findAll({
            attributes: ["totalPriceOutbound", "createdAt"],
            where: { createdAt: { [sequelize_1.Op.between]: [startDate, endDate] } },
            include: [
                {
                    model: order_1.Order,
                    required: true,
                    attributes: [],
                    where: {
                        ...(userId ? { userId } : {}),
                        status: { [sequelize_1.Op.in]: ["accept", "planning", "completed"] },
                    },
                },
            ],
            raw: true,
        });
    },
    //====================================REVENUE YEAR=======================================
    getRawOutboundMultiYear: async ({ startDate, endDate, userId, }) => {
        return outboundHistory_1.OutboundHistory.findAll({
            attributes: ["customerId", "dateOutbound", "totalPricePayment"],
            where: {
                dateOutbound: { [sequelize_1.Op.between]: [startDate, endDate] },
                totalPricePayment: { [sequelize_1.Op.gt]: 0 },
            },
            include: [
                {
                    model: customer_1.Customer,
                    required: true,
                    attributes: ["customerId", "customerName"],
                    where: userId ? { userId } : undefined,
                },
            ],
            raw: true,
            nest: true,
        });
    },
    //====================================ERROR PRODUCTION=======================================
    getEmployeeErrorProduction: async (employeeId) => {
        return await employeeBasicInfo_1.EmployeeBasicInfo.findByPk(Number(employeeId), {
            attributes: ["fullName"],
            raw: true,
        });
    },
    getQcInspectionPaper: async ({ paperWhere, startDate, endDate, hasErrorOnly = false, }) => {
        return await qcInspectionPaper_1.QcInspectionPaper.findAll({
            attributes: ["timeInspection", "checkList", "planningId"],
            where: {
                timeInspection: { [sequelize_1.Op.between]: [startDate, endDate] },
            },
            include: [
                {
                    model: planningPaper_1.PlanningPaper,
                    attributes: ["chooseMachine", "shiftManagement"],
                    where: paperWhere ?? {},
                    required: true,
                },
            ],
            raw: true,
            nest: true,
        });
    },
    getQcInspectionBox: async ({ boxWhere, startDate, endDate, }) => {
        return await qcInspectionBox_1.QcInspectionBox.findAll({
            attributes: ["timeInspection", "checkList"],
            where: { timeInspection: { [sequelize_1.Op.between]: [startDate, endDate] } },
            include: [
                {
                    model: planningBoxMachineTime_1.PlanningBoxTime,
                    as: "PlanningBoxTime",
                    attributes: ["machine", "shiftManagement", "planningBoxId"],
                    where: boxWhere,
                    required: true,
                },
            ],
            raw: true,
            nest: true,
        });
    },
    getReportPlanningPaper: async ({ startDate, endDate, paperWhere, attributes, }) => {
        const defaultAttributes = [
            "planningId",
            "shiftProduction",
            "shiftManagement",
            "dayReport",
            "qtyProduced",
        ];
        const options = {
            attributes: attributes ?? defaultAttributes,
            where: {
                dayReport: { [sequelize_1.Op.between]: [startDate, endDate] },
            },
            raw: true,
        };
        if (paperWhere) {
            options.include = [
                {
                    model: planningPaper_1.PlanningPaper,
                    attributes: ["chooseMachine"],
                    where: paperWhere,
                    required: true,
                },
            ];
            options.nest = true;
        }
        return await reportPlanningPaper_1.ReportPlanningPaper.findAll(options);
    },
    getReportPlanningBox: async ({ startDate, endDate, }) => {
        return await reportPlanningBox_1.ReportPlanningBox.findAll({
            attributes: ["planningBoxId", "dayReport", "machine", "shiftManagement", "qtyProduced"],
            where: { dayReport: { [sequelize_1.Op.between]: [startDate, endDate] } },
            raw: true,
        });
    },
    getPaperRequirement: async (planningIds) => {
        const whereCondition = {};
        if (planningIds && planningIds.length > 0) {
            whereCondition.planningId = { [sequelize_1.Op.in]: planningIds };
        }
        return await paperRequirements_1.PaperRequirements.findAll({
            attributes: ["planningId", [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("totalRequiredQty")), "totalRequiredQty"]],
            where: whereCondition,
            group: ["planningId"],
            raw: true,
        });
    },
};
//# sourceMappingURL=synthetic.reportRepository.js.map