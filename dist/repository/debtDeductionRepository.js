"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.debtDeductionRepository = void 0;
const sequelize_1 = require("sequelize");
const debtDeductionRequest_1 = require("../models/debt/debtDeductionRequest");
const customer_1 = require("../models/customer/customer");
exports.debtDeductionRepository = {
    buildDebtDeductionOptions: ({ page, pageSize, isExport = false, status, filterUserId, customerId, }) => {
        const debtCondition = { status: { [sequelize_1.Op.in]: status } };
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
    getDebtDeductionByIds: async ({ requestIds, options, }) => {
        const include = [];
        if (options?.includeCustomer) {
            include.push({
                model: customer_1.Customer,
                attributes: ["customerId", "customerName", "companyName"],
            });
        }
        return await debtDeductionRequest_1.DebtDeductionRequest.findAll({
            where: { requestId: { [sequelize_1.Op.in]: requestIds } },
            include: include.length > 0 ? include : undefined,
            lock: options?.lock,
            transaction: options?.transaction,
        });
    },
    deleteById: (requestId, transaction) => {
        return debtDeductionRequest_1.DebtDeductionRequest.destroy({
            where: { requestId },
            transaction,
        });
    },
};
//# sourceMappingURL=debtDeductionRepository.js.map