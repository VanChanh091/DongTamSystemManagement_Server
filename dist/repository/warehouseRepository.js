"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.warehouseRepository = void 0;
const box_1 = require("../models/order/box");
const user_1 = require("../models/user/user");
const order_1 = require("../models/order/order");
const product_1 = require("../models/product/product");
const customer_1 = require("../models/customer/customer");
const planningBox_1 = require("../models/planning/planningBox");
const qcSession_1 = require("../models/qualityControl/qcSession");
const planningPaper_1 = require("../models/planning/planningPaper");
const sequelize_1 = require("sequelize");
const inboundHistory_1 = require("../models/warehouse/inboundHistory");
const inventory_1 = require("../models/warehouse/inventory/inventory");
const outboundDetail_1 = require("../models/warehouse/outbound/outboundDetail");
const outboundHistory_1 = require("../models/warehouse/outbound/outboundHistory");
const planningBoxMachineTime_1 = require("../models/planning/planningBoxMachineTime");
const timeOverflowPlanning_1 = require("../models/planning/timeOverflowPlanning");
exports.warehouseRepository = {
    //====================================WAITING CHECK========================================
    //paper
    getPaperWaitingChecked: async () => {
        const paper = await planningPaper_1.PlanningPaper.findAll({
            where: {
                hasBox: false,
                qtyProduced: { [sequelize_1.Op.ne]: 0 },
                statusRequest: { [sequelize_1.Op.in]: ["requested", "inbounded"] },
            },
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
                        "dvt",
                        "isBox",
                        "isFSC",
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
        return paper.filter((paper) => {
            const totalInbound = paper.inbound.reduce((sum, inbound) => sum + inbound.qtyInbound, 0);
            return (paper.qtyProduced ?? 0) > totalInbound;
        });
    },
    //box
    getBoxWaitingChecked: async () => {
        const box = await planningBox_1.PlanningBox.findAll({
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
                        "isFSC",
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
                { model: planningBoxMachineTime_1.PlanningBoxTime, as: "boxTimes", attributes: ["machine", "qtyProduced"] },
                { model: inboundHistory_1.InboundHistory, as: "inbound", attributes: ["dateInbound", "qtyInbound"] },
            ],
        });
        return box.filter((box) => {
            const totalInbound = box.inbound.reduce((sum, inbound) => sum + inbound.qtyInbound, 0);
            //tìm min qtyProduced của boxTimes
            const qtyProduced = box.boxTimes?.map((bt) => bt.qtyProduced ?? 0) ?? [];
            const minQtyProduced = qtyProduced.length > 0 ? Math.min(...qtyProduced) : 0;
            return minQtyProduced > totalInbound;
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
    buildInboundOptions: ({ page, pageSize, whereCondition, isExport = false, }) => {
        const queryOptions = {
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
                        "dvt",
                        "dayReceiveOrder",
                        "lengthPaperManufacture",
                        "paperSizeManufacture",
                        "quantityManufacture",
                        "isFSC",
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
            queryOptions.offset = (page - 1) * pageSize;
            queryOptions.limit = pageSize;
        }
        if (isExport) {
            queryOptions.raw = true;
            queryOptions.nest = true;
        }
        return queryOptions;
    },
    //------------------------MEILISEARCH-----------------------------
    buildMeiliInboundOptions: ({ whereCondition, transaction, }) => {
        const queryOptions = {
            where: whereCondition,
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
        };
        return queryOptions;
    },
    syncInboundForMeili: async (inboundId, transaction) => {
        return await inboundHistory_1.InboundHistory.findOne(exports.warehouseRepository.buildMeiliInboundOptions({ whereCondition: { inboundId }, transaction }));
    },
    syncAllInboundsForMeili: () => {
        return inboundHistory_1.InboundHistory.findAll(exports.warehouseRepository.buildMeiliInboundOptions({}));
    },
    //====================================OUTBOUND HISTORY========================================
    getOutboundByPage: async ({ page, pageSize, whereCondition, }) => {
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
        };
        if (page && pageSize) {
            query.offset = (page - 1) * pageSize;
            query.limit = pageSize;
            query.order = [["dateOutbound", "DESC"]];
        }
        return await outboundHistory_1.OutboundHistory.findAndCountAll(query);
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
                        "lengthPaperManufacture",
                        "paperSizeManufacture",
                        "quantityCustomer",
                        "dvt",
                        "discount",
                        "isFSC",
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
    //total price by date
    getTotalPriceByDateRanges: async ({ whereCondition }) => {
        return await outboundHistory_1.OutboundHistory.findAll({
            where: whereCondition,
            attributes: [
                [sequelize_1.Sequelize.fn("DATE", sequelize_1.Sequelize.col("dateOutbound")), "dateStr"],
                [sequelize_1.Sequelize.fn("SUM", sequelize_1.Sequelize.col("totalPriceOrder")), "total"],
            ],
            group: [sequelize_1.Sequelize.fn("DATE", sequelize_1.Sequelize.col("dateOutbound"))],
            raw: true,
        });
    },
    //total price 3 cols
    getTotalPriceGrandTotal: async (whereCondition) => {
        return await outboundHistory_1.OutboundHistory.findOne({
            where: whereCondition,
            attributes: [
                [sequelize_1.Sequelize.fn("SUM", sequelize_1.Sequelize.col("totalPriceOrder")), "totalPriceOrder"],
                [sequelize_1.Sequelize.fn("SUM", sequelize_1.Sequelize.col("totalPriceVAT")), "totalPriceVAT"],
                [sequelize_1.Sequelize.fn("SUM", sequelize_1.Sequelize.col("totalPricePayment")), "totalPricePayment"],
            ],
            raw: true,
        });
    },
    ///start autoComplete
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
                "lengthPaperCustomer",
                "paperSizeCustomer",
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
            attributes: ["orderId", "dayReceiveOrder", "lengthPaperManufacture", "paperSizeManufacture"],
            include: [
                { model: customer_1.Customer, attributes: ["customerName"] },
                {
                    model: inventory_1.Inventory,
                    attributes: ["qtyInventory"],
                    required: true,
                },
            ],
            limit: 40,
            order: [["orderId", "ASC"]],
        });
    },
    ///end autoComplete
    sumOutboundQty: async (orderId, transaction) => {
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
                                "lengthPaperManufacture",
                                "paperSizeCustomer",
                                "paperSizeManufacture",
                                "dvt",
                                "discount",
                                "vat",
                                "pricePaper",
                                "orderIdCustomer",
                            ],
                            include: [
                                {
                                    model: customer_1.Customer,
                                    attributes: ["customerName", "companyName", "companyAddress", "mst", "phone"],
                                },
                                { model: product_1.Product, attributes: ["typeProduct", "productName"] },
                            ],
                        },
                    ],
                },
            ],
        });
    },
    //------------------------MEILISEARCH-----------------------------
    buildMeiliOutboundOptions: ({ whereCondition, transaction, }) => {
        const queryOptions = {
            where: whereCondition,
            attributes: ["outboundId", "outboundSlipCode", "dateOutbound", "status"],
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
        };
        return queryOptions;
    },
    syncOutboundForMeili: async (outboundId, transaction) => {
        return await outboundHistory_1.OutboundHistory.findOne(exports.warehouseRepository.buildMeiliOutboundOptions({
            whereCondition: { outboundId },
            transaction,
        }));
    },
    syncAllOutboundsForMeili: async () => {
        return await outboundHistory_1.OutboundHistory.findAll(exports.warehouseRepository.buildMeiliOutboundOptions({}));
    },
};
//# sourceMappingURL=warehouseRepository.js.map