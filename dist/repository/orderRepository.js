"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderRepository = void 0;
const sequelize_1 = require("sequelize");
const customer_1 = require("../models/customer/customer");
const box_1 = require("../models/order/box");
const product_1 = require("../models/product/product");
const user_1 = require("../models/user/user");
const order_1 = require("../models/order/order");
const fluteRatio_1 = require("../models/admin/fluteRatio");
const orderImage_1 = require("../models/order/orderImage");
const planningPaper_1 = require("../models/planning/planningPaper");
const paperClassifications_1 = require("../models/admin/paperClassifications/paperClassifications");
const supplierPaperCodes_1 = require("../models/admin/paperClassifications/supplierPaperCodes");
const suppliers_1 = require("../models/admin/paperClassifications/suppliers");
exports.orderRepository = {
    buildOrdersOptions: ({ whereCondition = {}, isExport = false, }) => {
        const queryOptions = {
            where: whereCondition,
            attributes: { exclude: ["createdAt", "updatedAt"] },
            include: [
                { model: customer_1.Customer, attributes: ["customerName", "companyName"] },
                { model: product_1.Product, attributes: ["typeProduct", "productName", "maKhuon"] },
                { model: box_1.Box, as: "box", attributes: { exclude: ["createdAt", "updatedAt"] } },
                { model: orderImage_1.OrderImage, attributes: ["imageUrl"] },
                { model: user_1.User, attributes: ["fullName"] },
                { model: planningPaper_1.PlanningPaper, attributes: ["planningId"], required: false },
            ],
            order: [
                // sort theo accept -> planning | pending -> reject
                ["statusPriority", "DESC"],
                // sort theo orderId
                ["orderSortValue", "ASC"],
            ],
        };
        if (isExport) {
            queryOptions.raw = true;
            queryOptions.nest = true;
        }
        return queryOptions;
    },
    findOneFluteRatio: async (flute, transaction) => {
        return await fluteRatio_1.FluteRatio.findOne({
            where: { fluteName: flute },
            attributes: ["ratio"],
            transaction,
        });
    },
    getOrdersByIds: async ({ orderIds, transaction, options = {}, }) => {
        return await order_1.Order.findAll({
            where: { orderId: { [sequelize_1.Op.in]: orderIds } },
            transaction,
            lock: transaction.LOCK.UPDATE,
            ...options,
        });
    },
    ///start auto complete
    getOrderIdRaw: async (orderId) => {
        return await order_1.Order.findAll({
            where: { orderId: { [sequelize_1.Op.like]: `%${orderId}%` } },
            attributes: ["orderId", "dayReceiveOrder"],
            include: [{ model: customer_1.Customer, attributes: ["customerName"] }],
            order: [["createdAt", "DESC"]],
            limit: 15,
        });
    },
    getOrderDetail: async (orderId) => {
        return await order_1.Order.findOne({
            where: { orderId },
            attributes: {
                exclude: [
                    "flute",
                    "acreage",
                    "totalPrice",
                    "totalPriceVAT",
                    "status",
                    "rejectReason",
                    "volume",
                    "orderSortValue",
                    "statusPriority",
                    "createdAt",
                    "updatedAt",
                ],
            },
            include: [
                { model: customer_1.Customer, attributes: ["customerName"] },
                { model: product_1.Product, attributes: ["maKhuon"] },
                {
                    model: box_1.Box,
                    as: "box",
                    attributes: { exclude: ["boxId", "createdAt", "updatedAt", "orderId"] },
                },
            ],
        });
    },
    ///end auto complete
    //------------------------MEILISEARCH-----------------------------
    buildMeiliOrderOptions: ({ whereCondition, transaction, }) => {
        const queryOptions = {
            where: whereCondition,
            attributes: [
                "orderId",
                "dayReceiveOrder",
                "flute",
                "QC_box",
                "status",
                "userId",
                "orderSortValue",
            ],
            include: [
                { model: customer_1.Customer, attributes: ["customerName"] },
                { model: product_1.Product, attributes: ["productName"] },
                { model: user_1.User, attributes: ["fullName"] },
            ],
            transaction,
        };
        return queryOptions;
    },
    syncOrderForMeili: async ({ orderId, transaction, }) => {
        return await order_1.Order.findOne(exports.orderRepository.buildMeiliOrderOptions({ whereCondition: { orderId }, transaction }));
    },
    syncOrdersForMeili: async ({ orderIds, transaction, }) => {
        return await order_1.Order.findAll(exports.orderRepository.buildMeiliOrderOptions({
            whereCondition: { orderId: { [sequelize_1.Op.in]: orderIds } },
            transaction,
        }));
    },
    syncAllOrdersForMeili: async () => {
        return await order_1.Order.findAll(exports.orderRepository.buildMeiliOrderOptions({}));
    },
    getAllPaperClassifications: async () => {
        return await paperClassifications_1.PaperClassifications.findAll({
            attributes: ["classificationId", "paperCode"],
            where: { pricePaper: { [sequelize_1.Op.gt]: 0 } },
            include: [
                {
                    model: supplierPaperCodes_1.SupplierPaperCodes,
                    as: "supplierPaper",
                    attributes: ["layerType"],
                    required: true,
                    include: [
                        {
                            model: suppliers_1.Suppliers,
                            as: "Supplier",
                            where: { isActive: true },
                            attributes: ["supplierName"],
                            required: true,
                        },
                    ],
                },
            ],
            order: [
                [
                    { model: supplierPaperCodes_1.SupplierPaperCodes, as: "supplierPaper" },
                    { model: suppliers_1.Suppliers, as: "Supplier" },
                    "supplierName",
                    "ASC",
                ],
            ],
        });
    },
};
//# sourceMappingURL=orderRepository.js.map