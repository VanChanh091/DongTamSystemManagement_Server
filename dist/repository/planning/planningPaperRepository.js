"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.planningPaperRepository = void 0;
const sequelize_1 = require("sequelize");
const box_1 = require("../../models/order/box");
const order_1 = require("../../models/order/order");
const product_1 = require("../../models/product/product");
const customer_1 = require("../../models/customer/customer");
const planningBox_1 = require("../../models/planning/planningBox");
const planningPaper_1 = require("../../models/planning/planningPaper");
const timeOverflowPlanning_1 = require("../../models/planning/timeOverflowPlanning");
exports.planningPaperRepository = {
    getPlanningPaper: async ({ page = 1, pageSize = 20, whereCondition, paginate = false, }) => {
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
        return await planningPaper_1.PlanningPaper.findAndCountAll(query);
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
    getPapersById: async ({ planningIds, options = {}, }) => {
        const { attributes, include } = options;
        return await planningPaper_1.PlanningPaper.findAll({
            attributes,
            include,
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
    syncPaperFromOrderToMeili: async (planningId, transaction) => {
        return await planningPaper_1.PlanningPaper.findByPk(planningId, {
            attributes: ["planningId", "ghepKho", "orderId", "chooseMachine", "status"],
            include: [
                {
                    model: order_1.Order,
                    attributes: ["orderId"],
                    include: [
                        { model: customer_1.Customer, attributes: ["customerName"] },
                        { model: product_1.Product, attributes: ["productName"] },
                    ],
                },
            ],
            transaction,
        });
    },
};
//# sourceMappingURL=planningPaperRepository.js.map