"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.planningStatusRepository = void 0;
const sequelize_1 = require("sequelize");
const box_1 = require("../../models/order/box");
const order_1 = require("../../models/order/order");
const product_1 = require("../../models/product/product");
const customer_1 = require("../../models/customer/customer");
const planningBoxMachineTime_1 = require("../../models/planning/planningBoxMachineTime");
const planningPaper_1 = require("../../models/planning/planningPaper");
const crud_helper_repository_1 = require("../helper/crud.helper.repository");
exports.planningStatusRepository = {
    //====================================PLANNING ORDER========================================
    getOrderAccept: async (type) => {
        const whereOrder = { status: "accept" };
        //flag use to inner join or left join with PlanningPaper
        let isPlanningRequired = false;
        //lọc theo planned/unplanned
        if (type === "planned") {
            isPlanningRequired = true;
        }
        else if (type === "unplanned") {
            whereOrder["$PlanningPapers.planningId$"] = { [sequelize_1.Op.is]: null };
            isPlanningRequired = false;
        }
        else if (type === "partial") {
            whereOrder[sequelize_1.Op.and] = [
                { "$PlanningPapers.planningId$": { [sequelize_1.Op.ne]: null } },
                sequelize_1.Sequelize.where(sequelize_1.Sequelize.col("quantityManufacture"), sequelize_1.Op.gt, sequelize_1.Sequelize.col("PlanningPapers.runningPlan")),
            ];
            isPlanningRequired = true;
        }
        return await order_1.Order.findAll({
            where: whereOrder,
            attributes: {
                exclude: [
                    "lengthPaperCustomer",
                    "paperSizeCustomer",
                    "quantityCustomer",
                    "acreage",
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
                {
                    model: planningPaper_1.PlanningPaper,
                    attributes: ["planningId", "runningPlan", "qtyProduced"],
                    required: isPlanningRequired,
                },
            ],
            order: [
                ["orderSortValue", "ASC"],
                ["dateRequestShipping", "ASC"],
            ],
            subQuery: false,
        });
    },
    findOrderById: async (orderId, transaction) => {
        return await order_1.Order.findOne({
            where: { orderId },
            attributes: {
                exclude: [
                    "lengthPaperCustomer",
                    "paperSizeCustomer",
                    "acreage",
                    "dvt",
                    "price",
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
            transaction,
        });
    },
    createPlanningBoxTime: async (machineTimes, transaction) => {
        return await planningBoxMachineTime_1.PlanningBoxTime.bulkCreate(machineTimes, { validate: true, transaction });
    },
    //====================================PLANNING STOP========================================
    getStopByIds: async (planningIds, transaction) => {
        return planningPaper_1.PlanningPaper.findAll({
            where: { planningId: { [sequelize_1.Op.in]: planningIds } },
            attributes: [
                "planningId",
                "dayCompleted",
                "dayStart",
                "timeRunning",
                "status",
                "sortPlanning",
            ],
            transaction,
        });
    },
    updateStatusPlanning: async ({ planningIds, action, transaction, }) => {
        const data = action === "planning"
            ? {
                status: action,
                dayCompleted: null,
                dayStart: null,
                timeRunning: null,
                sortPlanning: null,
            }
            : { status: action };
        return crud_helper_repository_1.CrudHelper.updateData({
            model: planningPaper_1.PlanningPaper,
            data,
            options: { where: { planningId: { [sequelize_1.Op.in]: planningIds } }, transaction },
        });
    },
};
//# sourceMappingURL=planningStatusRepository.js.map