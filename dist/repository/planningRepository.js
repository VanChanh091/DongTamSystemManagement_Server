"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.planningRepository = void 0;
const sequelize_1 = require("sequelize");
const customer_1 = require("../models/customer/customer");
const order_1 = require("../models/order/order");
const planningPaper_1 = require("../models/planning/planningPaper");
const product_1 = require("../models/product/product");
const box_1 = require("../models/order/box");
const planningBox_1 = require("../models/planning/planningBox");
const planningBoxMachineTime_1 = require("../models/planning/planningBoxMachineTime");
const timeOverflowPlanning_1 = require("../models/planning/timeOverflowPlanning");
exports.planningRepository = {
    //====================================FUNC GLOBAL========================================
    getModelById: async (model, where, options = {}) => {
        return await model.findOne({
            where,
            ...options,
        });
    },
    updateDataModel: async (model, data, options = {}) => {
        return await model.update(data, options);
    },
    deleteModelData: async (model, where, transaction) => {
        return await model.destroy({ where, transaction });
    },
    createPlanning: async (model, data, transaction) => {
        return await model.create(data, { transaction });
    },
    //====================================PLANNING ORDER========================================
    getOrderAccept: async () => {
        return await order_1.Order.findAll({
            where: { status: "accept" },
            attributes: {
                exclude: [
                    "lengthPaperCustomer",
                    "paperSizeCustomer",
                    "quantityCustomer",
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
                ],
            },
            include: [
                {
                    model: customer_1.Customer,
                    attributes: ["customerName", "companyName"],
                },
                { model: product_1.Product, attributes: ["typeProduct", "productName"] },
                // { model: Box, as: "box", attributes: ["boxId"] },
                { model: planningPaper_1.PlanningPaper, attributes: ["planningId", "runningPlan", "qtyProduced"] },
            ],
            order: [
                [sequelize_1.Sequelize.literal("CAST(SUBSTRING_INDEX(`Order`.`orderId`, '/', 1) AS UNSIGNED)"), "ASC"],
                ["dateRequestShipping", "ASC"],
            ],
        });
    },
    findOrderById: async (orderId) => {
        return await order_1.Order.findOne({
            where: { orderId },
            attributes: {
                exclude: [
                    "lengthPaperCustomer",
                    "paperSizeCustomer",
                    "acreage",
                    "dvt",
                    "price",
                    "pricePaper",
                    "discount",
                    "profit",
                    "vat",
                    "totalPriceVAT",
                    "rejectReason",
                    "createdAt",
                    "updatedAt",
                ],
            },
            include: [
                {
                    model: customer_1.Customer,
                    attributes: ["customerName", "companyName"],
                },
                { model: product_1.Product, attributes: ["typeProduct", "productName"] },
                { model: box_1.Box, as: "box" },
                { model: planningPaper_1.PlanningPaper, attributes: ["planningId", "runningPlan"] },
            ],
        });
    },
    createPlanningBoxTime: async (machineTimes) => {
        return await planningBoxMachineTime_1.PlanningBoxTime.bulkCreate(machineTimes, { validate: true });
    },
    //====================================QUEUE PAPER========================================
    getPlanningPaperCount: async (whereCondition = {}) => {
        return await planningPaper_1.PlanningPaper.count({ where: whereCondition });
    },
    getPlanningPaper: async ({ page = 1, pageSize = 20, whereCondition = {}, paginate = false, }) => {
        const query = {
            where: whereCondition,
            attributes: { exclude: ["createdAt", "updatedAt"] },
            include: [
                {
                    model: timeOverflowPlanning_1.timeOverflowPlanning,
                    as: "timeOverFlow",
                    attributes: {
                        exclude: ["createdAt", "updatedAt"],
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
                            "quantityCustomer",
                            "day",
                            "matE",
                            "matB",
                            "matC",
                            "songE",
                            "songB",
                            "songC",
                            "songE2",
                            "numberChild",
                            "lengthPaperManufacture",
                            "paperSizeManufacture",
                            "status",
                        ],
                    },
                    include: [{ model: customer_1.Customer, attributes: ["customerName", "companyName"] }],
                },
            ],
        };
        if (paginate) {
            query.offset = (page - 1) * pageSize;
            query.limit = pageSize;
        }
        return await planningPaper_1.PlanningPaper.findAll(query);
    },
    getPapersByOrderId: async (orderId) => {
        return await planningPaper_1.PlanningPaper.findAll({
            where: {
                orderId: {
                    [sequelize_1.Op.like]: `%${orderId}%`,
                },
            },
            include: [
                {
                    model: order_1.Order,
                    attributes: {
                        exclude: [
                            "dayReceiveOrder",
                            "acreage",
                            "dvt",
                            "price",
                            "pricePaper",
                            "discount",
                            "profit",
                            "totalPrice",
                            "vat",
                            "rejectReason",
                            "createdAt",
                            "updatedAt",
                        ],
                    },
                    include: [
                        {
                            model: customer_1.Customer,
                            attributes: ["customerName", "companyName"],
                        },
                        {
                            model: box_1.Box,
                            as: "box",
                            attributes: {
                                exclude: ["createdAt", "updatedAt"],
                            },
                        },
                    ],
                },
            ],
        });
    },
    getPapersByPlanningId: async (planningIds) => {
        return await planningPaper_1.PlanningPaper.findAll({
            where: {
                planningId: { [sequelize_1.Op.in]: planningIds },
            },
        });
    },
    getBoxByPlanningId: async (paperId) => {
        return planningBox_1.PlanningBox.findAll({
            where: { planningId: paperId },
        });
    },
    getPapersByUpdateIndex: async (updateIndex, transaction) => {
        return await planningPaper_1.PlanningPaper.findAll({
            where: { planningId: updateIndex.map((i) => i.planningId) },
            include: [{ model: order_1.Order }, { model: timeOverflowPlanning_1.timeOverflowPlanning, as: "timeOverFlow" }],
            order: [["sortPlanning", "ASC"]],
            transaction,
        });
    },
    //====================================QUEUE BOX========================================
    getAllPlanningBox: async ({ whereCondition = {}, machine, }) => {
        return await planningBox_1.PlanningBox.findAll({
            where: whereCondition,
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
                    where: { machine: { [sequelize_1.Op.ne]: machine } },
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
                    model: timeOverflowPlanning_1.timeOverflowPlanning,
                    as: "timeOverFlow",
                    required: false,
                    where: { machine: machine },
                    attributes: { exclude: ["createdAt", "updatedAt"] },
                },
                {
                    model: order_1.Order,
                    attributes: [
                        "orderId",
                        "dayReceiveOrder",
                        "flute",
                        "QC_box",
                        "numberChild",
                        "dateRequestShipping",
                        "customerId",
                        "productId",
                        "quantityCustomer",
                    ],
                    include: [
                        {
                            model: customer_1.Customer,
                            attributes: ["customerName", "companyName"],
                        },
                        {
                            model: box_1.Box,
                            as: "box",
                            attributes: { exclude: ["createdAt", "updatedAt"] },
                        },
                    ],
                },
            ],
        });
    },
    getPlanningBoxSearch: async (whereCondition = {}) => {
        return await planningBox_1.PlanningBox.findAll({
            attributes: ["planningBoxId", "orderId", "planningId"],
            include: [
                {
                    model: planningBoxMachineTime_1.PlanningBoxTime,
                    where: whereCondition,
                    as: "boxTimes",
                    attributes: ["machine", "status", "planningBoxId"],
                },
                {
                    model: order_1.Order,
                    attributes: ["QC_box"],
                    include: [
                        {
                            model: customer_1.Customer,
                            attributes: ["customerName", "companyName"],
                        },
                    ],
                },
            ],
        });
    },
    getBoxsByOrderId: async (orderId) => {
        return await planningBox_1.PlanningBox.findAll({
            where: {
                orderId: {
                    [sequelize_1.Op.like]: `%${orderId}%`,
                },
            },
        });
    },
    getBoxsById: async (planningBoxIds, machine) => {
        return await planningBoxMachineTime_1.PlanningBoxTime.findAll({
            where: {
                planningBoxId: {
                    [sequelize_1.Op.in]: planningBoxIds,
                },
                machine,
            },
        });
    },
    getBoxesByUpdateIndex: async (updateIndex, machine, transaction) => {
        return await planningBox_1.PlanningBox.findAll({
            where: { planningBoxId: updateIndex.map((i) => i.planningBoxId) },
            include: [
                { model: timeOverflowPlanning_1.timeOverflowPlanning, as: "timeOverFlow" },
                { model: planningBoxMachineTime_1.PlanningBoxTime, as: "boxTimes", where: { machine } },
                {
                    model: order_1.Order,
                    include: [{ model: box_1.Box, as: "box", attributes: ["inMatTruoc", "inMatSau"] }],
                },
            ],
            order: [[{ model: planningBoxMachineTime_1.PlanningBoxTime, as: "boxTimes" }, "sortPlanning", "ASC"]],
            transaction,
        });
    },
    getTimeOverflowPaper: async (machine, transaction) => {
        return await timeOverflowPlanning_1.timeOverflowPlanning.findOne({
            include: [
                {
                    model: planningPaper_1.PlanningPaper,
                    attributes: ["status", "ghepKho", "chooseMachine"],
                    where: { chooseMachine: machine, status: "complete" },
                    required: true,
                },
            ],
            order: [
                ["overflowDayStart", "DESC"],
                ["overflowTimeRunning", "DESC"],
            ],
            transaction,
        });
    },
    getTimeOverflowBox: async (machine, transaction) => {
        return await timeOverflowPlanning_1.timeOverflowPlanning.findOne({
            include: [
                {
                    model: planningBox_1.PlanningBox,
                    include: [
                        {
                            model: planningBoxMachineTime_1.PlanningBoxTime,
                            as: "boxTimes",
                            where: { machine, status: "complete" },
                            attributes: ["status", "machine"],
                            required: true,
                        },
                    ],
                },
            ],
            order: [
                ["overflowDayStart", "DESC"],
                ["overflowTimeRunning", "DESC"],
            ],
            transaction,
        });
    },
    //====================================PLANNING STOP========================================
};
//# sourceMappingURL=planningRepository.js.map