"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderRepository = void 0;
const sequelize_1 = require("sequelize");
const customer_1 = require("../models/customer/customer");
const box_1 = require("../models/order/box");
const product_1 = require("../models/product/product");
const user_1 = require("../models/user/user");
const order_1 = require("../models/order/order");
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
                //1. sort theo accept -> planning
                [sequelize_1.Sequelize.literal(`CASE WHEN status = '${statusList[0]}' THEN 0 ELSE 1 END`), "ASC"],
                //2. sort theo 3 số đầu của orderId
                [sequelize_1.Sequelize.literal("CAST(SUBSTRING_INDEX(`Order`.`orderId`, '/', 1) AS UNSIGNED)"), "ASC"],
                //3. nếu trùng orderId thì sort theo dateRequestShipping
                ["dateRequestShipping", "ASC"],
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
            ],
            order: [["createdAt", "DESC"]],
        });
    },
};
//# sourceMappingURL=orderRepository.js.map