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
exports.orderRepository = {
    buildQueryOptions: (whereCondition = {}, statusList) => {
        return {
            where: whereCondition,
            attributes: { exclude: ["createdAt", "updatedAt"] },
            include: [
                { model: customer_1.Customer, attributes: ["customerName", "companyName"] },
                { model: product_1.Product, attributes: ["typeProduct", "productName", "maKhuon"] },
                { model: box_1.Box, as: "box", attributes: { exclude: ["createdAt", "updatedAt"] } },
                { model: user_1.User, attributes: ["fullName"] },
            ],
            order: [
                //1. sort theo accept -> planning | pending -> reject
                ["statusPriority", "ASC"],
                //2. sort theo orderId
                ["orderSortValue", "ASC"],
            ],
        };
    },
    findAndCountAll: (queryOptions) => {
        return order_1.Order.findAndCountAll(queryOptions);
    },
    findAll: (queryOptions) => {
        return order_1.Order.findAll(queryOptions);
    },
    findAllFilter: async (whereCondition = {}) => {
        return await order_1.Order.findAll({
            where: whereCondition,
            include: [
                { model: customer_1.Customer, attributes: ["customerName", "companyName"] },
                {
                    model: product_1.Product,
                    attributes: ["typeProduct", "productName", "maKhuon"],
                },
                {
                    model: box_1.Box,
                    as: "box",
                    attributes: {
                        exclude: ["boxId", "createdAt", "updatedAt", "orderId"],
                    },
                },
                { model: user_1.User, attributes: ["fullName"] },
            ],
            order: [["createdAt", "DESC"]],
        });
    },
    findOneFluteRatio: async (flute) => {
        return await fluteRatio_1.FluteRatio.findOne({ where: { fluteName: flute }, attributes: ["ratio"] });
    },
    //repo for auto complete
    getOrderIdRaw: async (orderId) => {
        return await order_1.Order.findAll({
            where: { orderId: { [sequelize_1.Op.like]: `%${orderId}%` } },
            attributes: ["orderId", "dayReceiveOrder"],
            include: [{ model: customer_1.Customer, attributes: ["customerName"] }],
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
                {
                    model: product_1.Product,
                    attributes: ["maKhuon"],
                },
                {
                    model: box_1.Box,
                    as: "box",
                    attributes: {
                        exclude: ["boxId", "createdAt", "updatedAt", "orderId"],
                    },
                },
            ],
        });
    },
};
//# sourceMappingURL=orderRepository.js.map