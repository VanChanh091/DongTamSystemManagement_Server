import { FindOptions, Op, Transaction, WhereOptions } from "sequelize";
import { CustomerPayment } from "../models/customer/customerPayment";
import { OutboundHistory } from "../models/warehouse/outbound/outboundHistory";
import { Customer } from "../models/customer/customer";
import { PaymentAllocation } from "../models/warehouse/payment/paymentAllocation";

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
    lock,
    transaction,
    includeCustomer = true,
  }: {
    customerId?: string | string[];
    userId?: number;
    lock?: FindOptions["lock"]; // lấy kiểu lock của Sequelize
    transaction?: Transaction;
    includeCustomer?: boolean;
  }) => {
    const whereCondition: WhereOptions = {
      status: { [Op.in]: ["unpaid", "partial"] },
      remainingAmount: { [Op.gt]: 0 },
    };

    if (customerId) {
      whereCondition.customerId = Array.isArray(customerId) ? { [Op.in]: customerId } : customerId;
    }

    return await OutboundHistory.findAll({
      attributes: { exclude: ["createdAt", "updatedAt"] },
      where: whereCondition,
      include: includeCustomer
        ? [
            {
              model: Customer,
              where: userId ? { userId } : {},
              attributes: ["customerId", "customerName"],
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
};
