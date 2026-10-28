"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentAllocationRepository = void 0;
const sequelize_1 = require("sequelize");
const paymentAllocation_1 = require("../models/warehouse/payment/paymentAllocation");
const outboundHistory_1 = require("../models/warehouse/outbound/outboundHistory");
const customer_1 = require("../models/customer/customer");
const debtDeductionRequest_1 = require("../models/debt/debtDeductionRequest");
const dayjs_config_1 = require("../assets/configs/dayjs/dayjs.config");
exports.paymentAllocationRepository = {
    getOutboundAllocationHistory: async (outboundId) => {
        return await paymentAllocation_1.PaymentAllocation.findAll({
            where: { outboundId },
            attributes: ["allocationId", "amountAllocation", "paymentMethod", "createdAt"],
            raw: true,
            order: [["createdAt", "ASC"]],
        });
    },
    buildAllocationQuery: ({ fromDate, toDate, customerId, search, isExport = false, }) => {
        const where = {};
        if (fromDate && toDate) {
            const start = (0, dayjs_config_1.dayjsUtc)(fromDate).startOf("day").toDate();
            const end = (0, dayjs_config_1.dayjsUtc)(toDate).endOf("day").toDate();
            where.createdAt = { [sequelize_1.Op.between]: [start, end] };
        }
        if (customerId)
            where.customerId = customerId;
        const outboundWhere = {};
        if (search && search.trim() !== "") {
            outboundWhere.outboundSlipCode = { [sequelize_1.Op.like]: `%${search.trim()}%` };
        }
        const queryOptions = {
            where,
            include: [
                {
                    model: outboundHistory_1.OutboundHistory,
                    as: "outbound",
                    attributes: [
                        "outboundId",
                        "outboundSlipCode",
                        "dateOutbound",
                        "totalPricePayment",
                        "status",
                    ],
                    where: Object.keys(outboundWhere).length > 0 ? outboundWhere : undefined,
                    required: Object.keys(outboundWhere).length > 0,
                },
                {
                    model: customer_1.Customer,
                    attributes: ["customerId", "customerName", "companyName"],
                },
                {
                    model: debtDeductionRequest_1.DebtDeductionRequest,
                    as: "debtDeduction",
                    attributes: ["requestId", "requestedBy", "approvedBy"],
                },
            ],
            order: [["createdAt", "DESC"]],
        };
        if (isExport) {
            queryOptions.raw = true;
            queryOptions.nest = true;
        }
        return queryOptions;
    },
};
//# sourceMappingURL=paymentAllocationRepository.js.map