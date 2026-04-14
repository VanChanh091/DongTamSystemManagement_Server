"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.warehouseRepository = void 0;
const box_1 = require("../models/order/box");
const user_1 = require("../models/user/user");
const order_1 = require("../models/order/order");
const product_1 = require("../models/product/product");
const sequelize_1 = require("sequelize");
const customer_1 = require("../models/customer/customer");
const inventory_1 = require("../models/warehouse/inventory/inventory");
const planningBox_1 = require("../models/planning/planningBox");
const qcSession_1 = require("../models/qualityControl/qcSession");
const planningPaper_1 = require("../models/planning/planningPaper");
const inboundHistory_1 = require("../models/warehouse/inboundHistory");
const outboundDetail_1 = require("../models/warehouse/outboundDetail");
const outboundHistory_1 = require("../models/warehouse/outboundHistory");
const planningBoxMachineTime_1 = require("../models/planning/planningBoxMachineTime");
const timeOverflowPlanning_1 = require("../models/planning/timeOverflowPlanning");
exports.warehouseRepository = {
    //====================================WAITING CHECK========================================
    //paper
    getPaperWaitingChecked: async () => {
        return await planningPaper_1.PlanningPaper.findAll({
            where: { hasBox: false, statusRequest: { [sequelize_1.Op.in]: ["requested", "inbounded"] } },
            attributes: { exclude: ["createdAt", "updatedAt"] },
            include: [
                {
                    model: timeOverflowPlanning_1.timeOverflowPlanning,
                    as: "timeOverFlow",
                    attributes: { exclude: ["createdAt", "updatedAt", "status"] },
                },
                {
                    model: order_1.Order,
                    where: { isBox: false },
                    attributes: [
                        "orderId",
                        "dayReceiveOrder",
                        "flute",
                        "QC_box",
                        "canLan",
                        "daoXa",
                        "quantityManufacture",
                        "dateRequestShipping",
                        "instructSpecial",
                        "isBox",
                        "customerId",
                        "productId",
                    ],
                    include: [
                        { model: customer_1.Customer, attributes: ["customerName", "companyName"] },
                        {
                            model: box_1.Box,
                            as: "box",
                            attributes: { exclude: ["createdAt", "updatedAt", "orderId"] },
                        },
                    ],
                },
                { model: inboundHistory_1.InboundHistory, as: "inbound", attributes: ["dateInbound", "qtyInbound"] },
            ],
            order: [["sortPlanning", "ASC"]],
        });
    },
    //box
    getBoxWaitingChecked: async () => {
        return await planningBox_1.PlanningBox.findAll({
            where: { statusRequest: { [sequelize_1.Op.in]: ["requested", "inbounded"] } },
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
                    "hasOverFlow",
                    "isRequestCheck",
                    "createdAt",
                    "updatedAt",
                ],
            },
            include: [
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
                            attributes: { exclude: ["createdAt", "updatedAt", "orderId"] },
                        },
                    ],
                },
                { model: inboundHistory_1.InboundHistory, as: "inbound", attributes: ["dateInbound", "qtyInbound"] },
            ],
        });
    },
    getBoxCheckedDetail: async (planningBoxId) => {
        return await planningBox_1.PlanningBox.findByPk(planningBoxId, {
            attributes: ["planningBoxId", "qtyPaper", "hasOverFlow", "orderId", "planningId"],
            include: [
                {
                    model: planningBoxMachineTime_1.PlanningBoxTime,
                    as: "boxTimes",
                    attributes: {
                        exclude: ["createdAt", "updatedAt", "boxTimeId", "status", "sortPlanning"],
                    },
                },
            ],
        });
    },
    //====================================INBOUND HISTORY========================================
    getInboundSumByPlanning: async (key, ids) => {
        if (!ids.length)
            return [];
        const rows = await inboundHistory_1.InboundHistory.findAll({
            attributes: [key, [sequelize_1.Sequelize.fn("SUM", sequelize_1.Sequelize.col("qtyInbound")), "totalInbound"]],
            where: { [key]: ids },
            group: [key],
            raw: true,
        });
        return rows;
    },
    findInboundByPage: async ({ page = 1, pageSize = 20, whereCondition, }) => {
        const query = {
            where: whereCondition,
            attributes: { exclude: ["createdAt", "updatedAt"] },
            include: [
                {
                    model: order_1.Order,
                    attributes: [
                        "QC_box",
                        "day",
                        "flute",
                        "matE",
                        "matB",
                        "matC",
                        "matE2",
                        "songE",
                        "songB",
                        "songC",
                        "songE2",
                        "dayReceiveOrder",
                        "lengthPaperCustomer",
                        "paperSizeCustomer",
                        "quantityCustomer",
                    ],
                    include: [
                        { model: customer_1.Customer, attributes: ["customerName", "companyName"] },
                        { model: product_1.Product, attributes: ["typeProduct", "productName"] },
                    ],
                },
                { model: qcSession_1.QcSession, attributes: ["checkedBy"] },
            ],
            order: [["dateInbound", "DESC"]],
        };
        if (page && pageSize) {
            query.offset = (page - 1) * pageSize;
            query.limit = pageSize;
        }
        return await inboundHistory_1.InboundHistory.findAndCountAll(query);
    },
    syncInbound: async (inboundId, transaction) => {
        return await inboundHistory_1.InboundHistory.findByPk(inboundId, {
            attributes: ["inboundId", "dateInbound"],
            include: [
                {
                    model: order_1.Order,
                    attributes: ["orderId"],
                    include: [{ model: customer_1.Customer, attributes: ["customerName"] }],
                },
                { model: qcSession_1.QcSession, attributes: ["checkedBy"] },
            ],
            transaction,
        });
    },
    //====================================OUTBOUND HISTORY========================================
    getOutboundByPage: async ({ page = 1, pageSize = 20, whereCondition, }) => {
        const query = {
            where: whereCondition,
            attributes: { exclude: ["createdAt", "updatedAt"] },
            include: [
                {
                    model: outboundDetail_1.OutboundDetail,
                    as: "detail",
                    attributes: ["outboundDetailId", "orderId"],
                    separate: true,
                    limit: 1,
                    include: [
                        {
                            model: order_1.Order,
                            attributes: ["orderId", "dayReceiveOrder"],
                            include: [{ model: customer_1.Customer, attributes: ["customerName", "companyName"] }],
                        },
                    ],
                },
            ],
            order: [["dateOutbound", "DESC"]],
        };
        if (page && pageSize) {
            query.offset = (page - 1) * pageSize;
            query.limit = pageSize;
        }
        return await outboundHistory_1.OutboundHistory.findAndCountAll(query);
    },
    getOutboundForMeili: async (outboundId, transaction) => {
        return await outboundHistory_1.OutboundHistory.findByPk(outboundId, {
            attributes: ["outboundId", "outboundSlipCode", "dateOutbound"],
            include: [
                {
                    model: outboundDetail_1.OutboundDetail,
                    as: "detail",
                    attributes: ["outboundDetailId"],
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
        });
    },
    getOutboundDetail: async (outboundId) => {
        return await outboundDetail_1.OutboundDetail.findAll({
            attributes: { exclude: ["createdAt", "updatedAt"] },
            where: { outboundId },
            include: [
                {
                    model: order_1.Order,
                    attributes: [
                        "dayReceiveOrder",
                        "flute",
                        "QC_box",
                        "lengthPaperCustomer",
                        "paperSizeCustomer",
                        "quantityCustomer",
                        "dvt",
                        "discount",
                    ],
                    include: [
                        { model: customer_1.Customer, attributes: ["customerName", "companyName"] },
                        { model: product_1.Product, attributes: ["typeProduct", "productName"] },
                        { model: inventory_1.Inventory, attributes: ["qtyInventory"] },
                    ],
                },
            ],
        });
    },
    findByPK: async (outboundId) => {
        return await outboundHistory_1.OutboundHistory.findByPk(outboundId, {
            attributes: ["outboundId"],
        });
    },
    getOrderInboundQty: async (orderId) => {
        return await order_1.Order.findOne({
            where: { orderId },
            attributes: [
                "orderId",
                "dayReceiveOrder",
                "flute",
                "QC_box",
                "quantityCustomer",
                "dvt",
                "pricePaper",
                "vat",
                "lengthPaperManufacture",
                "paperSizeManufacture",
            ],
            include: [
                { model: customer_1.Customer, attributes: ["customerName"] },
                { model: product_1.Product, attributes: ["typeProduct", "productName"] },
                { model: user_1.User, attributes: ["fullName"] },
            ],
        });
    },
    searchOrderIds: async (keyword) => {
        return await order_1.Order.findAll({
            where: { orderId: { [sequelize_1.Op.startsWith]: keyword } },
            attributes: ["orderId", "dayReceiveOrder"],
            include: [
                { model: customer_1.Customer, attributes: ["customerName"] },
                // {
                //   model: InboundHistory,
                //   attributes: ['qtyInbound'],
                //   required: true,
                //   where: { qtyInbound: { [Op.gt]: 0 } },
                // },
                {
                    model: inventory_1.Inventory,
                    attributes: ["qtyInventory"],
                    required: true,
                    where: { qtyInventory: { [sequelize_1.Op.ne]: 0 } },
                },
            ],
            limit: 20,
            order: [["orderId", "ASC"]],
        });
    },
    sumOutboundQty: async ({ orderId, transaction }) => {
        return await outboundDetail_1.OutboundDetail.sum("outboundQty", {
            where: { orderId },
            transaction,
        });
    },
    sumOutboundQtyExcludeOutbound: async ({ orderId, outboundId, transaction, }) => {
        return await outboundDetail_1.OutboundDetail.sum("outboundQty", {
            where: {
                orderId,
                outboundId: { [sequelize_1.Op.ne]: outboundId },
            },
            transaction,
        });
    },
    findOneForExportPDF: async (outboundId) => {
        return await outboundHistory_1.OutboundHistory.findByPk(outboundId, {
            attributes: { exclude: ["createdAt", "updatedAt", "totalOutboundQty"] },
            include: [
                {
                    model: outboundDetail_1.OutboundDetail,
                    as: "detail",
                    attributes: { exclude: ["createdAt", "updatedAt", "deliveredQty", "outboundId"] },
                    include: [
                        {
                            model: order_1.Order,
                            attributes: [
                                "orderId",
                                "flute",
                                "QC_box",
                                "quantityCustomer",
                                "lengthPaperCustomer",
                                "paperSizeCustomer",
                                "dvt",
                                "discount",
                                "vat",
                                "pricePaper",
                            ],
                            include: [
                                {
                                    model: customer_1.Customer,
                                    attributes: ["customerName", "companyName", "companyAddress", "mst", "phone"],
                                },
                                { model: product_1.Product, attributes: ["typeProduct", "productName"] },
                                { model: user_1.User, attributes: ["fullName"] },
                            ],
                        },
                    ],
                },
            ],
        });
    },
};
//# sourceMappingURL=warehouseRepository.js.map