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
            attributes: ["customerName", "phone"],
        });
    },
    //get by field
    buildCustomersOptions: ({ page, pageSize, whereCondition, isExport = false, }) => {
        const queryOptions = {
            where: whereCondition,
            attributes: { exclude: ["updatedAt"] },
            include: [
                {
                    model: customerPayment_1.CustomerPayment,
                    as: "payment",
                    attributes: { exclude: ["createdAt", "updatedAt"] },
                },
            ],
        };
        if (page && pageSize) {
            queryOptions.offset = (page - 1) * pageSize;
            queryOptions.limit = pageSize;
            queryOptions.order = [["customerSeq", "DESC"]];
        }
        if (isExport) {
            queryOptions.raw = true;
            queryOptions.nest = true;
        }
        return queryOptions;
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
    //------------------------MEILISEARCH-----------------------------
    buildMeiliCustomerOptions: ({ whereCondition, transaction, }) => {
        const queryOptions = {
            where: whereCondition,
            attributes: [
                "customerId",
                "customerName",
                "companyName",
                "cskh",
                "phone",
                "createdAt",
                "customerSeq",
            ],
            order: [["customerSeq", "ASC"]],
            transaction,
        };
        return queryOptions;
    },
    syncCustomerForMeili: async (customerId, transaction) => {
        return await customer_1.Customer.findOne(exports.customerRepository.buildMeiliCustomerOptions({ whereCondition: { customerId }, transaction }));
    },
    syncAllCustomersForMeili: async () => {
        return await customer_1.Customer.findAll(exports.customerRepository.buildMeiliCustomerOptions({}));
    },
};
//# sourceMappingURL=customerRepository.js.map