import { FindOptions, Op, Sequelize, Transaction, WhereOptions } from "sequelize";
import { CustomerPayment } from "../models/customer/customerPayment";
import { OutboundHistory } from "../models/warehouse/outbound/outboundHistory";
import { Customer } from "../models/customer/customer";
import { PaymentAllocation } from "../models/warehouse/payment/paymentAllocation";
import { dayjsUtc } from "../assets/configs/dayjs/dayjs.config";

export const debtRepository = {
  findOneCustomerPayment: async (customerId: string, transaction: Transaction) => {
    return await CustomerPayment.findOne({
      where: { customerId },
      attributes: ["paymentTermDays"],
      raw: true,
      transaction,
    });
  },

  findAllRawCustomerPayment: async () => {
    return await CustomerPayment.findAll({
      attributes: ["customerId", "paymentType", "closingDays", "paymentTermDays"],
      raw: true,
    });
  },

  findOutboundUnpaid: async ({
    customerId,
    userId,
    targetDate,
    search,
    lock,
    transaction,
    includeCustomer = true,
  }: {
    customerId?: string | string[];
    userId?: number;
    targetDate?: Date | string;
    search?: string;
    lock?: FindOptions["lock"]; // lấy kiểu lock của Sequelize
    transaction?: Transaction;
    includeCustomer?: boolean;
  }) => {
    const whereCondition: WhereOptions = {
      status: { [Op.in]: ["unpaid", "partial"] },
      remainingAmount: { [Op.gt]: 0 },
    };

    if (targetDate) {
      const endOfDayStr = dayjsUtc(targetDate).endOf("day").format("YYYY-MM-DD HH:mm:ss");
      whereCondition.dateOutbound = {
        [Op.lte]: endOfDayStr,
      };
    }

    if (customerId) {
      whereCondition.customerId = Array.isArray(customerId) ? { [Op.in]: customerId } : customerId;
    }

    // Điều kiện lọc cho bảng Customer
    const customerWhere: WhereOptions = {};
    if (userId) {
      customerWhere.userId = userId;
    }

    if (search && search.trim()) {
      const keyword = `%${search.trim()}%`;
      customerWhere.customerName = { [Op.like]: keyword };
    }

    return await OutboundHistory.findAll({
      attributes: { exclude: ["createdAt", "updatedAt"] },
      where: whereCondition,
      include: includeCustomer
        ? [
            {
              model: Customer,
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

  findOutboundById: async ({
    outboundSlipCode,
    options,
  }: {
    outboundSlipCode: string;
    options: FindOptions;
  }) => {
    return await OutboundHistory.findOne({
      where: {
        status: { [Op.in]: ["unpaid", "partial"] },
        remainingAmount: { [Op.gt]: 0 },
        outboundSlipCode,
      },
      ...options,
    });
  },

  updateDueDateForOutbound: async ({
    dueDate,
    customerId,
    closingDate,
    transaction,
  }: {
    dueDate: Date;
    customerId: string | string[];
    closingDate: Date;
    transaction: Transaction;
  }) => {
    const customerIds = Array.isArray(customerId) ? customerId : [customerId];

    return await OutboundHistory.update(
      { dueDate },
      {
        where: {
          customerId: { [Op.in]: customerIds },
          dueDate: null,
          status: { [Op.in]: ["unpaid", "partial"] },
          dateOutbound: { [Op.lte]: closingDate },
          remainingAmount: { [Op.gt]: 0 },
        },
        transaction,
      },
    );
  },

  bulkUpdateOutboundStatus: async (
    updateData: {
      paidAmount: number;
      remainingAmount: number;
      status: string;
    }[],
    transaction?: Transaction,
  ) => {
    return await OutboundHistory.bulkCreate(updateData as any, {
      updateOnDuplicate: ["paidAmount", "remainingAmount", "status"],
      transaction,
    });
  },

  bulkCreatePaymentAllocation: async (allocationsToCreate: any[], transaction: Transaction) => {
    return await PaymentAllocation.bulkCreate(allocationsToCreate, { transaction });
  },

  getCustomerCurrentDebt: async (customerId: string, transaction?: Transaction): Promise<number> => {
    const total = await OutboundHistory.sum("remainingAmount", {
      where: {
        customerId,
        status: { [Op.in]: ["unpaid", "partial"] },
        remainingAmount: { [Op.gt]: 0 },
      },
      transaction,
    });
    return Number(total || 0);
  },

  getCustomersCurrentDebt: async (customerIds: string[]): Promise<Map<string, number>> => {
    const records = await OutboundHistory.findAll({
      attributes: [
        "customerId",
        [Sequelize.fn("SUM", Sequelize.col("remainingAmount")), "totalDebt"],
      ],
      where: {
        customerId: { [Op.in]: customerIds },
        status: { [Op.in]: ["unpaid", "partial"] },
        remainingAmount: { [Op.gt]: 0 },
      },
      group: ["customerId"],
      raw: true,
    });

    const map = new Map<string, number>();
    for (const record of records as any[]) {
      map.set(record.customerId, Number(record.totalDebt || 0));
    }
    return map;
  },
};

