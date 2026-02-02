"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportRepository = void 0;
const sequelize_1 = require("sequelize");
const customer_1 = require("../models/customer/customer");
const box_1 = require("../models/order/box");
const order_1 = require("../models/order/order");
const planningBox_1 = require("../models/planning/planningBox");
const planningBoxMachineTime_1 = require("../models/planning/planningBoxMachineTime");
const planningPaper_1 = require("../models/planning/planningPaper");
const reportPlanningBox_1 = require("../models/report/reportPlanningBox");
const reportPlanningPaper_1 = require("../models/report/reportPlanningPaper");
exports.reportRepository = {
    reportCount: async (model) => {
        return await model.count();
    },
    findReportPaperByMachine: async (machine, pageSize, offset) => {
        return await reportPlanningPaper_1.ReportPlanningPaper.findAll({
            attributes: { exclude: ["createdAt", "updatedAt"] },
            include: [
                {
                    model: planningPaper_1.PlanningPaper,
                    where: { chooseMachine: machine },
                    attributes: {
                        exclude: [
                            "createdAt",
                            "updatedAt",
                            "dayCompleted",
                            "shiftProduction",
                            "shiftProduction",
                            "shiftManagement",
                            "status",
                            "hasOverFlow",
                            "sortPlanning",
                        ],
                    },
                    include: [
                        {
                            model: order_1.Order,
                            attributes: {
                                exclude: [
                                    "acreage",
                                    "dvt",
                                    "price",
                                    "pricePaper",
                                    "discount",
                                    "profit",
                                    "vat",
                                    "rejectReason",
                                    "createdAt",
                                    "updatedAt",
                                    "lengthPaperCustomer",
                                    "paperSizeCustomer",
                                    "quantityCustomer",
                                    "day",
                                    "matE",
                                    "matB",
                                    "matC",
                                    "songE",
                                    "songB",
                                    "songC",
                                    "songE2",
                                    "lengthPaperManufacture",
                                    "status",
                                ],
                            },
                            include: [
                                { model: customer_1.Customer, attributes: ["customerName", "companyName"] },
                                {
                                    model: box_1.Box,
                                    as: "box",
                                    attributes: { exclude: ["createdAt", "updatedAt"] },
                                },
                            ],
                        },
                    ],
                },
            ],
            offset,
            limit: pageSize,
            order: [["dayReport", "DESC"]],
        });
    },
    findAlReportBox: async (machine, pageSize, offset) => {
        return await reportPlanningBox_1.ReportPlanningBox.findAll({
            where: { machine: machine },
            attributes: { exclude: ["createdAt", "updatedAt"] },
            include: [
                {
                    model: planningBox_1.PlanningBox,
                    attributes: {
                        exclude: [
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
                            where: { machine: machine }, //tìm machine thỏa điều kiện
                            as: "boxTimes",
                            attributes: { exclude: ["createdAt", "updatedAt"] },
                        },
                        {
                            model: planningBoxMachineTime_1.PlanningBoxTime,
                            as: "allBoxTimes",
                            where: {
                                machine: { [sequelize_1.Op.ne]: machine }, //lọc machine ra khỏi danh sách
                            },
                            attributes: {
                                exclude: [
                                    "timeRunning",
                                    "dayStart",
                                    "dayCompleted",
                                    "wasteBox",
                                    "shiftManagement",
                                    "status",
                                    "sortPlanning",
                                    "createdAt",
                                    "updatedAt",
                                    "rpWasteLoss",
                                ],
                            },
                        },
                        {
                            model: order_1.Order,
                            attributes: {
                                exclude: [
                                    "acreage",
                                    "dvt",
                                    "price",
                                    "pricePaper",
                                    "discount",
                                    "profit",
                                    "vat",
                                    "rejectReason",
                                    "createdAt",
                                    "updatedAt",
                                    "lengthPaperCustomer",
                                    "paperSizeCustomer",
                                    "day",
                                    "matE",
                                    "matB",
                                    "matC",
                                    "songE",
                                    "songB",
                                    "songC",
                                    "songE2",
                                    "lengthPaperManufacture",
                                    "status",
                                ],
                            },
                            include: [
                                { model: customer_1.Customer, attributes: ["customerName", "companyName"] },
                                {
                                    model: box_1.Box,
                                    as: "box",
                                    attributes: { exclude: ["createdAt", "updatedAt"] },
                                },
                            ],
                        },
                    ],
                },
            ],
            offset,
            limit: pageSize,
            order: [["dayReport", "DESC"]],
        });
    },
    exportReportPaper: async (whereCondition = {}, machine) => {
        return await reportPlanningPaper_1.ReportPlanningPaper.findAll({
            where: whereCondition,
            attributes: { exclude: ["createdAt", "updatedAt"] },
            include: [
                {
                    model: planningPaper_1.PlanningPaper,
                    where: { chooseMachine: machine },
                    attributes: {
                        exclude: [
                            "createdAt",
                            "updatedAt",
                            "dayCompleted",
                            "shiftProduction",
                            "shiftProduction",
                            "shiftManagement",
                            "status",
                            "hasOverFlow",
                            "sortPlanning",
                        ],
                    },
                    include: [
                        {
                            model: order_1.Order,
                            attributes: {
                                exclude: [
                                    "acreage",
                                    "dvt",
                                    "price",
                                    "pricePaper",
                                    "discount",
                                    "profit",
                                    "vat",
                                    "rejectReason",
                                    "createdAt",
                                    "updatedAt",
                                    "lengthPaperCustomer",
                                    "paperSizeCustomer",
                                    "quantityCustomer",
                                    "day",
                                    "matE",
                                    "matB",
                                    "matC",
                                    "songE",
                                    "songB",
                                    "songC",
                                    "songE2",
                                    "lengthPaperManufacture",
                                    "status",
                                ],
                            },
                            include: [
                                { model: customer_1.Customer, attributes: ["customerName", "companyName"] },
                                {
                                    model: box_1.Box,
                                    as: "box",
                                    attributes: { exclude: ["createdAt", "updatedAt"] },
                                },
                            ],
                        },
                    ],
                },
            ],
            order: [["dayReport", "ASC"]],
        });
    },
    exportReportBox: async (whereCondition = {}, machine) => {
        return reportPlanningBox_1.ReportPlanningBox.findAll({
            where: whereCondition,
            attributes: { exclude: ["createdAt", "updatedAt"] },
            include: [
                {
                    model: planningBox_1.PlanningBox,
                    attributes: {
                        exclude: [
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
                            where: { machine: machine },
                            as: "boxTimes",
                            attributes: { exclude: ["createdAt", "updatedAt"] },
                        },
                        {
                            model: planningBoxMachineTime_1.PlanningBoxTime,
                            as: "allBoxTimes",
                            where: {
                                machine: { [sequelize_1.Op.ne]: machine },
                            },
                            attributes: {
                                exclude: [
                                    "timeRunning",
                                    "dayStart",
                                    "dayCompleted",
                                    "wasteBox",
                                    "shiftManagement",
                                    "status",
                                    "sortPlanning",
                                    "createdAt",
                                    "updatedAt",
                                    "rpWasteLoss",
                                ],
                            },
                        },
                        {
                            model: order_1.Order,
                            attributes: {
                                exclude: [
                                    "acreage",
                                    "dvt",
                                    "price",
                                    "pricePaper",
                                    "discount",
                                    "profit",
                                    "vat",
                                    "rejectReason",
                                    "createdAt",
                                    "updatedAt",
                                    "lengthPaperCustomer",
                                    "paperSizeCustomer",
                                    "day",
                                    "matE",
                                    "matB",
                                    "matC",
                                    "songE",
                                    "songB",
                                    "songC",
                                    "songE2",
                                    "lengthPaperManufacture",
                                    "status",
                                ],
                            },
                            include: [
                                { model: customer_1.Customer, attributes: ["customerName", "companyName"] },
                                {
                                    model: box_1.Box,
                                    as: "box",
                                    attributes: { exclude: ["createdAt", "updatedAt"] },
                                },
                            ],
                        },
                    ],
                },
            ],
        });
    },
};
//# sourceMappingURL=reportRepository.js.map