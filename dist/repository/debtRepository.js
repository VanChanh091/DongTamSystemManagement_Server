"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.debtRepository = void 0;
const sequelize_1 = require("sequelize");
const customerPayment_1 = require("../models/customer/customerPayment");
const outboundHistory_1 = require("../models/warehouse/outbound/outboundHistory");
const customer_1 = require("../models/customer/customer");
const paymentAllocation_1 = require("../models/warehouse/payment/paymentAllocation");
const dayjs_config_1 = require("../assets/configs/dayjs/dayjs.config");
exports.debtRepository = {
    findOneCustomerPayment: async (customerId, transaction) => {
        return await customerPayment_1.CustomerPayment.findOne({
            where: { customerId },
            attributes: ["paymentTermDays"],
            raw: true,
            transaction,
        });
    },
    findAllRawCustomerPayment: async () => {
        return await customerPayment_1.CustomerPayment.findAll({
            attributes: ["customerId", "paymentType", "closingDays", "paymentTermDays"],
            raw: true,
        });
    },
    findOutboundUnpaid: async ({ customerId, userId, targetDate, search, lock, transaction, includeCustomer = true, }) => {
        const whereCondition = {
            status: { [sequelize_1.Op.in]: ["unpaid", "partial"] },
            remainingAmount: { [sequelize_1.Op.gt]: 0 },
        };
        if (targetDate) {
            const endOfDayStr = (0, dayjs_config_1.dayjsUtc)(targetDate).endOf("day").format("YYYY-MM-DD HH:mm:ss");
            whereCondition.dateOutbound = {
                [sequelize_1.Op.lte]: endOfDayStr,
            };
        }
        if (customerId) {
            whereCondition.customerId = Array.isArray(customerId) ? { [sequelize_1.Op.in]: customerId } : customerId;
        }
        // Điều kiện lọc cho bảng Customer
        const customerWhere = {};
        if (userId) {
            customerWhere.userId = userId;
        }
        if (search && search.trim()) {
            const keyword = `%${search.trim()}%`;
            customerWhere.customerName = { [sequelize_1.Op.like]: keyword };
        }
        return await outboundHistory_1.OutboundHistory.findAll({
            attributes: { exclude: ["createdAt", "updatedAt"] },
            where: whereCondition,
            include: includeCustomer
                ? [
                    {
                        model: customer_1.Customer,
                        required: true,
                        where: customerWhere,
                        attributes: ["customerId", "customerName", "companyName"],
                    },
                ]
                : [],
            order: [["dateOutbound", "ASC"]],
            raw: true,
            nest: true, // cần có để lấy được thông tin customer
            lock,
            transaction,
        });
    },
    findOutboundById: async ({ outboundSlipCode, options, }) => {
        return await outboundHistory_1.OutboundHistory.findOne({
            where: {
                status: { [sequelize_1.Op.in]: ["unpaid", "partial"] },
                remainingAmount: { [sequelize_1.Op.gt]: 0 },
                outboundSlipCode,
            },
            ...options,
        });
    },
    updateDueDateForOutbound: async ({ dueDate, customerId, closingDate, transaction, }) => {
        const customerIds = Array.isArray(customerId) ? customerId : [customerId];
        return await outboundHistory_1.OutboundHistory.update({ dueDate }, {
            where: {
                customerId: { [sequelize_1.Op.in]: customerIds },
                dueDate: null,
                status: { [sequelize_1.Op.in]: ["unpaid", "partial"] },
                dateOutbound: { [sequelize_1.Op.lte]: closingDate },
                remainingAmount: { [sequelize_1.Op.gt]: 0 },
            },
            transaction,
        });
    },
    bulkUpdateOutboundStatus: async (updateData, transaction) => {
        return await outboundHistory_1.OutboundHistory.bulkCreate(updateData, {
            updateOnDuplicate: ["paidAmount", "remainingAmount", "status"],
            transaction,
        });
    },
    bulkCreatePaymentAllocation: async (allocationsToCreate, transaction) => {
        return await paymentAllocation_1.PaymentAllocation.bulkCreate(allocationsToCreate, { transaction });
    },
};
//# sourceMappingURL=debtRepository.js.map