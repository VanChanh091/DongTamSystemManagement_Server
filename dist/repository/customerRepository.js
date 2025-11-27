"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.customerRepository = void 0;
const sequelize_1 = require("sequelize");
const customer_1 = require("../models/customer/customer");
exports.customerRepository = {
    //get all
    customerCount: async () => {
        return await customer_1.Customer.count();
    },
    findAllCustomer: async () => {
        return await customer_1.Customer.findAll({
            attributes: { exclude: ["createdAt", "updatedAt"] },
        });
    },
    //get by field
    findCustomerByPage: async (page, pageSize) => {
        return await customer_1.Customer.findAll({
            attributes: { exclude: ["createdAt", "updatedAt"] },
            offset: (page - 1) * pageSize,
            limit: pageSize,
            order: [
                //lấy 4 số cuối -> ép chuỗi thành số để so sánh -> sort
                [sequelize_1.Sequelize.literal("CAST(RIGHT(`Customer`.`customerId`, 4) AS UNSIGNED)"), "ASC"],
            ],
        });
    },
    //create
    findAllIds: async (transaction) => {
        return await customer_1.Customer.findAll({
            attributes: ["customerId"],
            transaction,
        });
    },
    createCustomer: async (data, transaction) => {
        return await customer_1.Customer.create(data, { transaction });
    },
    //update
    findByCustomerId: async (customerId, transaction) => {
        return await customer_1.Customer.findOne({ where: { customerId }, transaction });
    },
    updateCustomer: async (customer, customerData, transaction) => {
        return await customer.update(customerData, { transaction });
    },
    //delete
    deleteCustomer: async (customerId, transaction) => {
        return await customer_1.Customer.destroy({
            where: { customerId },
            transaction,
        });
    },
    //export
    findAllForExport: async (whereCondition = {}) => {
        return await customer_1.Customer.findAll({
            where: whereCondition,
            attributes: { exclude: ["createdAt", "updatedAt"] },
            order: [
                //lấy 4 số cuối -> ép chuỗi thành số để so sánh -> sort
                [sequelize_1.Sequelize.literal("CAST(RIGHT(`Customer`.`customerId`, 4) AS UNSIGNED)"), "ASC"],
            ],
        });
    },
};
//# sourceMappingURL=customerRepository.js.map