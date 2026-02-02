"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRepository = void 0;
const sequelize_1 = require("sequelize");
const customer_1 = require("../models/customer/customer");
const box_1 = require("../models/order/box");
const order_1 = require("../models/order/order");
const product_1 = require("../models/product/product");
const user_1 = require("../models/user/user");
exports.adminRepository = {
    //===============================ADMIN CRUD=====================================
    getAllItems: async ({ model }) => {
        return await model.findAll({ attributes: { exclude: ["createdAt", "updatedAt"] } });
    },
    getItemByPk: async ({ model, itemId }) => {
        return await model.findByPk(itemId);
    },
    createNewItem: async ({ model, data, transaction, }) => {
        return await model.create(data, { transaction });
    },
    updateItem: async ({ model, dataUpdated, transaction, }) => {
        return await model.update(dataUpdated, { transaction });
    },
    deleteItem: async ({ model }) => {
        return await model.destroy();
    },
    //===============================ADMIN ORDER=====================================
    findOrderPending: async () => {
        return await order_1.Order.findAll({
            where: { status: "pending" },
            attributes: { exclude: ["createdAt", "updatedAt"] },
            include: [
                { model: customer_1.Customer, attributes: ["customerName", "companyName"] },
                {
                    model: product_1.Product,
                    attributes: ["typeProduct", "productName", "maKhuon", "productImage"],
                },
                { model: box_1.Box, as: "box" },
                { model: user_1.User, attributes: ["fullName"] },
            ],
            order: [["orderSortValue", "ASC"]],
        });
    },
    findByOrderId: async (orderId) => {
        return await order_1.Order.findOne({
            where: { orderId },
            attributes: [
                "orderId",
                "totalPrice",
                "status",
                "rejectReason",
                "customerId",
                "productId",
                "userId",
            ],
            include: [
                {
                    model: customer_1.Customer,
                    attributes: ["customerId", "debtCurrent", "debtLimit"],
                },
                {
                    model: product_1.Product,
                    attributes: ["productId", "typeProduct"],
                },
                { model: box_1.Box, as: "box" },
                { model: user_1.User, attributes: ["fullName"] },
            ],
        });
    },
    updateDebtCustomer: async (customer, newDebt) => {
        return await customer.update({ debtCurrent: newDebt });
    },
    //===============================ADMIN USER=====================================
    getAllUser: async () => {
        return await user_1.User.findAll({ attributes: { exclude: ["password", "createdAt", "updatedAt"] } });
    },
    getUserByName: async (nameLower) => {
        return await user_1.User.findAll({
            where: (0, sequelize_1.where)((0, sequelize_1.fn)("LOWER", (0, sequelize_1.col)("fullName")), {
                [sequelize_1.Op.like]: `%${nameLower}%`,
            }),
            attributes: { exclude: ["password"] },
        });
    },
    getUserByPhone: async (phone) => {
        return await user_1.User.findAll({
            where: { phone },
            attributes: { exclude: ["password"] },
        });
    },
    getUserByPk: async (userId) => {
        return await user_1.User.findByPk(userId);
    },
};
//# sourceMappingURL=adminRepository.js.map