"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.customerRepository = void 0;
const sequelize_1 = require("sequelize");
const customer_1 = require("../models/customer/customer");
const customerPayment_1 = require("../models/customer/customerPayment");
exports.customerRepository = {
    //get all
    findAllCustomer: async () => {
        return await customer_1.Customer.findAll({
            attributes: ["customerId", "customerName", "companyName"],
        });
    },
    //get by field
    findCustomerByPage: async ({ page, pageSize, whereCondition, }) => {
        const query = {
            where: whereCondition,
            attributes: { exclude: ["updatedAt"] },
            include: [
                {
                    model: customerPayment_1.CustomerPayment,
                    as: "payment",
                    attributes: { exclude: ["createdAt", "updatedAt"] },
                },
            ],
            order: [["customerSeq", "ASC"]],
        };
        if (page && pageSize) {
            query.offset = (page - 1) * pageSize;
            query.limit = pageSize;
        }
        return await customer_1.Customer.findAndCountAll(query);
    },
    findByIdOrMst: async (sanitizedPrefix, mst, transaction) => {
        return await customer_1.Customer.findAll({
            where: {
                [sequelize_1.Op.or]: [{ customerId: { [sequelize_1.Op.like]: `${sanitizedPrefix}%` } }, { mst }],
            },
            attributes: ["customerId", "mst"],
            transaction,
        });
    },
    //create
    createCustomer: async (data, transaction) => {
        return await customer_1.Customer.create(data, { transaction });
    },
    //update
    findCustomerByPk: async ({ customerId, options = {}, }) => {
        const includePayment = options.includePayment
            ? [
                {
                    model: customerPayment_1.CustomerPayment,
                    as: "payment",
                    attributes: { exclude: ["createdAt", "updatedAt"] },
                },
            ]
            : [];
        return await customer_1.Customer.findByPk(customerId, {
            attributes: { exclude: ["updatedAt"] },
            include: includePayment,
            transaction: options.transaction,
        });
    },
    updateCustomer: async (customer, customerData, transaction) => {
        return await customer.update(customerData, { transaction });
    },
    //find customer for meilisearch
    findCustomerForMeili: async (customerId, transaction) => {
        return await customer_1.Customer.findByPk(customerId, {
            attributes: ["customerId", "customerName", "companyName", "cskh", "phone", "customerSeq"],
            transaction,
        });
    },
    findCusPaymentByPk: async (customerId, transaction) => {
        return await customer_1.Customer.findByPk(customerId, {
            attributes: ["customerId"],
            include: [
                {
                    model: customerPayment_1.CustomerPayment,
                    as: "payment",
                    attributes: ["cusPaymentId", "timePayment"],
                },
            ],
            transaction,
        });
    },
};
//# sourceMappingURL=customerRepository.js.map