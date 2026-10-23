"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.debtDeductionRepository = void 0;
const debtDeductionRequest_1 = require("../models/debt/debtDeductionRequest");
const customer_1 = require("../models/customer/customer");
const user_1 = require("../models/user/user");
const paymentAllocation_1 = require("../models/warehouse/payment/paymentAllocation");
exports.debtDeductionRepository = {
    buildDebtDeductionOptions: ({ page, pageSize, isExport = false, status, filterUserId, customerId, }) => {
        const debtCondition = {};
        if (status)
            debtCondition.status = status;
        if (customerId)
            debtCondition.customerId = customerId;
        if (filterUserId)
            debtCondition.userId = filterUserId;
        const queryOptions = {
            where: debtCondition,
            attributes: { exclude: ["updatedAt"] },
            include: [{ model: customer_1.Customer, attributes: ["customerId", "customerName", "companyName"] }],
        };
        if (!isExport && page && pageSize) {
            queryOptions.offset = (page - 1) * pageSize;
            queryOptions.limit = pageSize;
            queryOptions.order = [["createdAt", "DESC"]];
        }
        if (isExport) {
            queryOptions.raw = true;
            queryOptions.nest = true;
        }
        return queryOptions;
    },
    getDebtDeductionById: async ({ requestId, options, }) => {
        const include = [];
        if (options?.includeCustomer) {
            include.push({
                model: customer_1.Customer,
                attributes: ["customerId", "customerName", "companyName"],
            });
        }
        return await debtDeductionRequest_1.DebtDeductionRequest.findByPk(requestId, {
            include: include.length > 0 ? include : undefined,
            lock: options?.lock,
            transaction: options?.transaction,
        });
    },
    findAndCountAll: async ({ where, limit, offset, order = [["createdAt", "DESC"]], }) => {
        return await debtDeductionRequest_1.DebtDeductionRequest.findAndCountAll({
            where,
            include: [
                { model: customer_1.Customer, attributes: ["customerId", "customerName", "companyName"] },
                { model: user_1.User, attributes: ["userId", "fullName", "department"] },
                { model: paymentAllocation_1.PaymentAllocation, as: "allocations" },
            ],
            order,
            limit,
            offset,
        });
    },
    deleteById: async (requestId, transaction) => {
        return await debtDeductionRequest_1.DebtDeductionRequest.destroy({
            where: { requestId },
            transaction,
        });
    },
};
//# sourceMappingURL=debtDeductionRepository.js.map