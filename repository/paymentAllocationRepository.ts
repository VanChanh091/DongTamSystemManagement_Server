import { FindOptions, Op, WhereOptions } from "sequelize";
import { PaymentAllocation } from "../models/warehouse/payment/paymentAllocation";
import { OutboundHistory } from "../models/warehouse/outbound/outboundHistory";
import { Customer } from "../models/customer/customer";
import { DebtDeductionRequest } from "../models/debt/debtDeductionRequest";
import { dayjsUtc } from "../assets/configs/dayjs/dayjs.config";

export const paymentAllocationRepository = {
  getOutboundAllocationHistory: async (outboundId: number) => {
    return await PaymentAllocation.findAll({
      where: { outboundId },
      attributes: ["allocationId", "amountAllocation", "paymentMethod", "createdAt"],
      raw: true,
      order: [["createdAt", "ASC"]],
    });
  },

  buildAllocationQuery: ({
    fromDate,
    toDate,
    customerId,
    search,
    isExport = false,
  }: {
    fromDate?: string | Date;
    toDate?: string | Date;
    customerId?: number;
    search?: string;
    isExport?: boolean;
  }): FindOptions => {
    const where: WhereOptions = {};

    if (fromDate && toDate) {
      const start = dayjsUtc(fromDate).startOf("day").toDate();
      const end = dayjsUtc(toDate).endOf("day").toDate();
      where.createdAt = { [Op.between]: [start, end] };
    }

    if (customerId) where.customerId = customerId;

    const outboundWhere: WhereOptions = {};
    if (search && search.trim() !== "") {
      outboundWhere.outboundSlipCode = { [Op.like]: `%${search.trim()}%` };
    }

    const queryOptions: FindOptions = {
      where,
      include: [
        {
          model: OutboundHistory,
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
          model: Customer,
          attributes: ["customerId", "customerName", "companyName"],
        },
        {
          model: DebtDeductionRequest,
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
