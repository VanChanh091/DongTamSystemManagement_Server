"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.manufactureRepo = void 0;
const box_1 = require("../models/order/box");
const order_1 = require("../models/order/order");
const customer_1 = require("../models/customer/customer");
const sequelize_1 = require("sequelize");
const planningBox_1 = require("../models/planning/planningBox");
const dayjs_config_1 = require("../assets/configs/dayjs/dayjs.config");
const planningPaper_1 = require("../models/planning/planningPaper");
const reportPlanningBox_1 = require("../models/report/reportPlanningBox");
const employeeBasicInfo_1 = require("../models/employee/employeeBasicInfo");
const reportPlanningPaper_1 = require("../models/report/reportPlanningPaper");
const planningBoxMachineTime_1 = require("../models/planning/planningBoxMachineTime");
const employeeCompanyInfo_1 = require("../models/employee/employeeCompanyInfo");
const timeOverflowPlanning_1 = require("../models/planning/timeOverflowPlanning");
exports.manufactureRepo = {
    //====================================HELPER=======================================
    getEmployeeByCode: async (reportedBy, transaction) => {
        return await employeeBasicInfo_1.EmployeeBasicInfo.findOne({
            attributes: ["fullName"],
            include: {
                model: employeeCompanyInfo_1.EmployeeCompanyInfo,
                as: "companyInfo",
                where: { employeeCode: reportedBy },
                attributes: ["employeeCode"],
            },
            transaction,
        });
    },
    //====================================PAPER========================================
    buildQueryManuPapers: async (whereCondition) => {
        return await planningPaper_1.PlanningPaper.findAll({
            where: whereCondition,
            attributes: { exclude: ["createdAt", "updatedAt"] },
            include: [
                {
                    model: timeOverflowPlanning_1.timeOverflowPlanning,
                    as: "timeOverFlow",
                    attributes: { exclude: ["createdAt", "updatedAt", "status"] },
                },
                {
                    model: order_1.Order,
                    attributes: [
                        "orderId",
                        "dayReceiveOrder",
                        "flute",
                        "QC_box",
                        "canLan",
                        "daoXa",
                        "dvt",
                        "quantityManufacture",
                        "dateRequestShipping",
                        "instructSpecial",
                        "isBox",
                        "chongTham",
                    ],
                    include: [{ model: customer_1.Customer, attributes: ["customerName"] }],
                },
            ],
            order: [["sortPlanning", "ASC"]],
        });
    },
    getManufacturePaper: async (machine, filterType = "all") => {
        const whereCondition = {
            chooseMachine: machine,
            status: { [sequelize_1.Op.in]: ["planning", "lackQty", "producing", "requested"] },
            dayStart: { [sequelize_1.Op.ne]: null },
        };
        const operatorMap = {
            gtZero: ">",
            ltZero: "<=",
        };
        const operator = operatorMap[filterType];
        if (operator) {
            whereCondition[sequelize_1.Op.and] = [
                sequelize_1.Sequelize.where(sequelize_1.Sequelize.col("runningPlan"), operator, sequelize_1.Sequelize.fn("COALESCE", sequelize_1.Sequelize.col("qtyProduced"), 0)),
            ];
        }
        return await exports.manufactureRepo.buildQueryManuPapers(whereCondition);
    },
    getPapersById: async (planningId, transaction) => {
        return await planningPaper_1.PlanningPaper.findOne({
            where: { planningId },
            include: [
                { model: timeOverflowPlanning_1.timeOverflowPlanning, as: "timeOverFlow" },
                {
                    model: order_1.Order,
                    attributes: ["quantityCustomer", "quantityManufacture", "pricePaper", "dvt", "flute"],
                },
            ],
            transaction,
            lock: transaction?.LOCK.UPDATE,
        });
    },
    getPapersByOrderId: async (orderId, transaction) => {
        return await planningPaper_1.PlanningPaper.findAll({
            where: { orderId: orderId },
            attributes: ["qtyProduced"],
            transaction,
        });
    },
    getReportPaperByPlanningId: async (planningId, transaction) => {
        return await reportPlanningPaper_1.ReportPlanningPaper.findOne({
            where: { planningId },
            order: [["createdAt", "DESC"]],
            transaction,
            lock: transaction?.LOCK.UPDATE,
        });
    },
    getOldPlanningPaper: async (planningId, transaction) => {
        return await planningPaper_1.PlanningPaper.findByPk(planningId, {
            attributes: [
                "planningId",
                "chooseMachine",
                "runningPlan",
                "qtyProduced",
                "dayCompleted",
                "status",
                "hasBox",
                "orderId",
                "lengthPaperPlanning",
                "numberChild",
            ],
            include: [
                {
                    model: order_1.Order,
                    attributes: ["orderId", "quantityCustomer", "quantityManufacture", "pricePaper", "dvt"],
                },
            ],
            transaction,
        });
    },
    getPlanningByDateAndShift: async ({ machine, dayCompleted, shiftProduction, transaction, }) => {
        const startDate = dayjs_config_1.dayjsUtc.utc(dayCompleted).format("YYYY-MM-DD 00:00:00");
        const endDate = dayjs_config_1.dayjsUtc.utc(dayCompleted).format("YYYY-MM-DD 23:59:59");
        // console.log(`start: ${startDate} - end: ${endDate}`);
        return await planningPaper_1.PlanningPaper.findAll({
            where: {
                chooseMachine: machine,
                dayCompleted: { [sequelize_1.Op.between]: [startDate, endDate] },
                shiftProduction: { [sequelize_1.Op.like]: `%${shiftProduction}%` },
            },
            attributes: [
                "planningId",
                "orderId",
                "totalLoss",
                "qtyWasteNorm",
                "dayCompleted",
                "lengthPaperPlanning",
                "sizePaperPLaning",
                "qtyProduced",
                "chooseMachine",
                "shiftProduction",
                "shiftManagement",
            ],
            include: [
                {
                    model: order_1.Order,
                    attributes: ["dayReceiveOrder", "flute"],
                    include: [{ model: customer_1.Customer, attributes: ["customerName"] }],
                },
            ],
            order: [["sortPlanning", "ASC"]],
            transaction,
        });
    },
    //====================================BOX========================================
    buildQueryManuBoxes: async ({ machine, targetStatus, }) => {
        return await planningBox_1.PlanningBox.findAll({
            attributes: {
                exclude: [
                    "dayStart",
                    "dayCompleted",
                    "hasIn",
                    "hasBe",
                    "hasXa",
                    "hasDan",
                    "hasCanLan",
                    "hasCatKhe",
                    "hasCanMang",
                    "hasDongGhim",
                    "createdAt",
                    "updatedAt",
                ],
            },
            include: [
                {
                    model: planningBoxMachineTime_1.PlanningBoxTime,
                    where: {
                        machine: machine,
                        dayStart: { [sequelize_1.Op.ne]: null },
                        status: targetStatus,
                    },
                    as: "boxTimes",
                    required: true,
                    attributes: { exclude: ["createdAt", "updatedAt"] },
                },
                {
                    model: planningBoxMachineTime_1.PlanningBoxTime,
                    as: "allBoxTimes",
                    where: { machine: { [sequelize_1.Op.ne]: machine } },
                    required: false,
                    attributes: ["boxTimeId", "qtyProduced", "machine"],
                },
                {
                    model: timeOverflowPlanning_1.timeOverflowPlanning,
                    as: "timeOverFlow",
                    required: false,
                    where: { machine: machine },
                    attributes: { exclude: ["createdAt", "updatedAt", "status"] },
                },
                {
                    model: order_1.Order,
                    attributes: [
                        "orderId",
                        "dayReceiveOrder",
                        "flute",
                        "QC_box",
                        "numberChild",
                        "instructSpecial",
                        "dateRequestShipping",
                        "quantityCustomer",
                        "customerId",
                        "productId",
                    ],
                    include: [
                        {
                            model: customer_1.Customer,
                            attributes: ["customerName", "companyName"],
                        },
                        {
                            model: box_1.Box,
                            as: "box",
                            attributes: { exclude: ["createdAt", "updatedAt", "orderId"] },
                        },
                    ],
                },
            ],
            order: [[{ model: planningBoxMachineTime_1.PlanningBoxTime, as: "boxTimes" }, "sortPlanning", "ASC"]],
        });
    },
    getBoxById: async (planningBoxId, machine, transaction) => {
        return await planningBoxMachineTime_1.PlanningBoxTime.findOne({
            where: { planningBoxId: planningBoxId, machine: machine },
            include: [
                {
                    model: planningBox_1.PlanningBox,
                    include: [
                        { model: timeOverflowPlanning_1.timeOverflowPlanning, as: "timeOverFlow" },
                        { model: order_1.Order, attributes: ["quantityCustomer"] },
                    ],
                },
            ],
            transaction,
            lock: transaction?.LOCK.UPDATE,
        });
    },
    getAllBoxTimeById: async (planningBoxId, transaction) => {
        return await planningBoxMachineTime_1.PlanningBoxTime.findAll({
            where: { planningBoxId },
            transaction,
        });
    },
    getReportBoxByPlanningBoxId: async (planningBoxId, machine, transaction) => {
        return await reportPlanningBox_1.ReportPlanningBox.findOne({
            where: { planningBoxId, machine },
            order: [["createdAt", "DESC"]],
            transaction,
            lock: transaction?.LOCK.UPDATE,
        });
    },
    //updateRequestStockCheck
    getBoxByPK: async (planningBoxId, machine, transaction) => {
        return await planningBox_1.PlanningBox.findByPk(planningBoxId, {
            include: [
                {
                    model: planningBoxMachineTime_1.PlanningBoxTime,
                    where: { machine, dayStart: { [sequelize_1.Op.ne]: null } },
                    as: "boxTimes",
                    attributes: ["boxTimeId", "qtyProduced", "machine", "isRequest"],
                },
            ],
            transaction,
            lock: transaction.LOCK.UPDATE,
        });
    },
    updatePlanningBoxTime: async (planningBoxId, machine, transaction) => {
        return await planningBoxMachineTime_1.PlanningBoxTime.update({ status: "planning" }, {
            where: {
                machine,
                status: "producing",
                planningBoxId: { [sequelize_1.Op.ne]: planningBoxId },
            },
            transaction,
        });
    },
};
//# sourceMappingURL=manufactureRepository.js.map