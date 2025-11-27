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
    //===============================ADMIN MACHINE=====================================
    getAllMachine: async (model) => {
        return await model.findAll({ attributes: { exclude: ["createdAt", "updatedAt"] } });
    },
    getMachineByPk: async (model, machineId) => {
        return await model.findByPk(machineId);
    },
    createMachine: async (model, data, transaction) => {
        return await model.create(data, { transaction });
    },
    updateMachine: async (machine, machineUpdated) => {
        return await machine.update(machineUpdated);
    },
    deleteMachine: async (machine) => {
        return await machine.destroy();
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
            order: [
                //lấy 3 số đầu tiên -> ép chuỗi thành số để so sánh -> sort
                [sequelize_1.Sequelize.literal("CAST(SUBSTRING_INDEX(`Order`.`orderId`, '/', 1) AS UNSIGNED)"), "ASC"],
                [sequelize_1.Sequelize.col("Order.createdAt"), "ASC"], // nếu trùng thì sort theo ngày tạo (tạo trước lên trên)
            ],
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
    //===============================ADMIN WASTE=====================================
    getAllWaste: async (model) => {
        return await model.findAll({ attributes: { exclude: ["createdAt", "updatedAt"] } });
    },
    getWasteByPk: async (model, wasteId) => {
        return await model.findByPk(wasteId);
    },
    createWaste: async (model, wasteData, transaction) => {
        return await model.create(wasteData, { transaction });
    },
    updateWaste: async (wasteModel, wasteDataUpdated) => {
        return await wasteModel.update(wasteDataUpdated);
    },
};
//# sourceMappingURL=adminRepository.js.map