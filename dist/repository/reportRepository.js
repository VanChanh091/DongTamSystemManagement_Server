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
    buildReportPaperOptions: ({ machine, page, pageSize, whereCondition, isExport = false, }) => {
        const reportPaperWhere = {};
        if (machine) {
            reportPaperWhere.chooseMachine = machine;
        }
        const queryOptions = {
            where: whereCondition,
            attributes: { exclude: ["createdAt", "updatedAt"] },
            include: [
                {
                    model: planningPaper_1.PlanningPaper,
                    where: reportPaperWhere,
                    attributes: {
                        exclude: [
                            "createdAt",
                            "updatedAt",
                            "dayCompleted",
                            "shiftProduction",
                            "shiftManagement",
                            "status",
                            "hasOverFlow",
                            "sortPlanning",
                            "totalPrice",
                            "qtyWasteNorm",
                            "note",
                            "statusRequest",
                            "deliveryPlanned",
                        ],
                    },
                    include: [
                        {
                            model: order_1.Order,
                            attributes: [
                                "orderId",
                                "dayReceiveOrder",
                                "dateRequestShipping",
                                "flute",
                                "canLan",
                                "daoXa",
                                "dvt",
                                "instructSpecial",
                                "isFSC",
                            ],
                            include: [{ model: customer_1.Customer, attributes: ["customerName"] }],
                        },
                    ],
                },
            ],
        };
        if (page && pageSize) {
            queryOptions.offset = (page - 1) * pageSize;
            queryOptions.limit = pageSize;
            queryOptions.order = [["dayReport", "DESC"]];
        }
        if (isExport) {
            queryOptions.raw = true;
            queryOptions.nest = true;
        }
        return queryOptions;
    },
    buildReportBoxOptions: ({ machine, page, pageSize, whereCondition, isExport = false, }) => {
        const boxTimesWhere = {};
        const allBoxTimesWhere = {};
        if (machine && machine.trim() !== "") {
            boxTimesWhere.machine = machine;
            allBoxTimesWhere.machine = { [sequelize_1.Op.ne]: machine };
        }
        else {
            // Nếu KHÔNG truyền máy (Xuất tất cả):
            // boxTimesWhere để trống để lấy tất cả các máy.
            // allBoxTimesWhere đặt một giá trị không tồn tại để trả về mảng rỗng [],
            allBoxTimesWhere.machine = "__ALL_MACHINES_SELECTED__";
        }
        const queryOptions = {
            where: whereCondition, //machine: machine
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
                            "statusRequest",
                        ],
                    },
                    include: [
                        {
                            model: planningBoxMachineTime_1.PlanningBoxTime,
                            where: boxTimesWhere, //tìm machine thỏa điều kiện
                            as: "boxTimes",
                            required: false,
                            attributes: [
                                "dayCompleted",
                                "boxTimeId",
                                "runningPlan",
                                "timeRunning",
                                "dayStart",
                                "wasteBox",
                                "rpWasteLoss",
                                "qtyProduced",
                                "machine",
                                "shiftManagement",
                            ],
                        },
                        {
                            model: planningBoxMachineTime_1.PlanningBoxTime,
                            as: "allBoxTimes",
                            where: allBoxTimesWhere,
                            required: false,
                            attributes: ["boxTimeId", "runningPlan", "qtyProduced", "machine"],
                        },
                        {
                            model: order_1.Order,
                            attributes: [
                                "orderId",
                                "dayReceiveOrder",
                                "dateRequestShipping",
                                "flute",
                                "QC_box",
                                "canLan",
                                "daoXa",
                                "paperSizeManufacture",
                                "quantityCustomer",
                                "quantityManufacture",
                                "numberChild",
                                "totalPrice",
                                "totalPriceVAT",
                                "volume",
                                "instructSpecial",
                                "isBox",
                                "isFSC",
                                "chongTham",
                            ],
                            include: [
                                { model: customer_1.Customer, attributes: ["customerName"] },
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
        };
        if (page && pageSize) {
            queryOptions.offset = (page - 1) * pageSize;
            queryOptions.limit = pageSize;
            queryOptions.order = [["dayReport", "DESC"]];
        }
        if (isExport) {
            queryOptions.raw = true;
            queryOptions.nest = true;
        }
        return queryOptions;
    },
    getReportPaperByIds: async (planningIds, transaction) => {
        return await reportPlanningPaper_1.ReportPlanningPaper.findAll({
            where: { planningId: { [sequelize_1.Op.in]: planningIds } },
            attributes: [
                "reportPaperId",
                "planningId",
                "qtyWasteNorm",
                "shiftProduction",
                "shiftManagement",
            ],
            transaction,
        });
    },
    //------------------------MEILISEARCH-----------------------------
    buildMeiliReportPaperOptions: ({ whereCondition, transaction, }) => {
        const queryOptions = {
            where: whereCondition,
            attributes: ["reportPaperId", "dayReport", "shiftManagement"],
            include: [
                {
                    model: planningPaper_1.PlanningPaper,
                    attributes: ["chooseMachine"],
                    include: [
                        {
                            model: order_1.Order,
                            attributes: ["orderId"],
                            include: [{ model: customer_1.Customer, attributes: ["customerName"] }],
                        },
                    ],
                },
            ],
            transaction,
        };
        return queryOptions;
    },
    syncReportPaperForMeili: async (reportPaperId, transaction) => {
        return await reportPlanningPaper_1.ReportPlanningPaper.findOne(exports.reportRepository.buildMeiliReportPaperOptions({
            whereCondition: { reportPaperId },
            transaction,
        }));
    },
    syncAllReportPapersForMeili: async () => {
        return await reportPlanningPaper_1.ReportPlanningPaper.findAll(exports.reportRepository.buildMeiliReportPaperOptions({}));
    },
    buildMeiliReportBoxOptions: ({ whereCondition, transaction, }) => {
        const queryOptions = {
            where: whereCondition,
            attributes: ["reportBoxId", "dayReport", "shiftManagement", "machine"],
            include: [
                {
                    model: planningBox_1.PlanningBox,
                    attributes: ["planningBoxId"],
                    include: [
                        {
                            model: order_1.Order,
                            attributes: ["orderId", "QC_box"],
                            include: [{ model: customer_1.Customer, attributes: ["customerName"] }],
                        },
                    ],
                },
            ],
            transaction,
        };
        return queryOptions;
    },
    syncReportBoxesForMeili: async (reportBoxId, transaction) => {
        return await reportPlanningBox_1.ReportPlanningBox.findOne(exports.reportRepository.buildMeiliReportBoxOptions({
            whereCondition: { reportBoxId },
            transaction,
        }));
    },
    syncAllReportBoxesForMeili: async () => {
        return await reportPlanningBox_1.ReportPlanningBox.findAll(exports.reportRepository.buildMeiliReportBoxOptions({}));
    },
};
//# sourceMappingURL=reportRepository.js.map