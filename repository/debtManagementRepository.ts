import { Op, Transaction } from "sequelize";
import { OutboundHistory, statusOutbound } from "../models/warehouse/outbound/outboundHistory";
import { PaymentReceipt, SourcePaymentType } from "../models/warehouse/payment/paymentReceipt";
import { PaymentAllocation } from "../models/warehouse/payment/paymentAllocation";
import { CustomerPayment } from "../models/customer/customerPayment";

export const debtManagementRepo = {
  // 1. Lấy danh sách PXK còn nợ của khách hàng theo thứ tự ưu tiên FIFO (đơn cũ xếp trước)
  getUnpaidOutboundsFifo: async (customerId: string, transaction?: Transaction) => {
    return await OutboundHistory.findAll({
      where: {
        customerId,
        status: { [Op.in]: ["unpaid", "partial"] },
        remainingAmount: { [Op.gt]: 0 },
      },
      order: [["dateOutbound", "ASC"]], // Cũ nhất đứng đầu
      transaction,
      lock: transaction?.LOCK.UPDATE, // Row-level lock để tránh race condition
    });
  },

  // 2. Tạo Phiếu Thu
  createPaymentReceipt: async (
    data: {
      customerId: string;
      amountPayment: number;
      paymentDate: Date;
      sourcePayment: SourcePaymentType;
      note?: string;
    },
    transaction?: Transaction,
  ) => {
    return await PaymentReceipt.create(data, { transaction });
  },

  // 3. Tạo Bản ghi Gạch nợ Chi tiết
  createPaymentAllocation: async (
    data: {
      receiptId: number;
      outboundId: number;
      amountAllocation: number;
    },
    transaction?: Transaction,
  ) => {
    return await PaymentAllocation.create(data, { transaction });
  },

  // 4. Cập nhật thông tin thanh toán của PXK
  updateOutboundPayment: async (
    outboundId: number,
    data: {
      paidAmount: number;
      remainingAmount: number;
      status: statusOutbound;
      writeOffAmount?: number;
      writeOffNote?: string;
    },
    transaction?: Transaction,
  ) => {
    return await OutboundHistory.update(data, {
      where: { outboundId },
      transaction,
    });
  },

  // 5. Cập nhật Tổng dư nợ hiện tại (debtCurrent) của Khách hàng
  recalculateCustomerDebtCurrent: async (customerId: string, transaction?: Transaction) => {
    const totalRemaining = await OutboundHistory.sum("remainingAmount", {
      where: {
        customerId,
        status: { [Op.in]: ["unpaid", "partial"] },
      },
      transaction,
    });

    const newDebtCurrent = totalRemaining || 0;

    await CustomerPayment.update(
      { debtCurrent: newDebtCurrent },
      { where: { customerId }, transaction },
    );

    return newDebtCurrent;
  },

  // 6. Lấy toàn bộ PXK còn nợ để tính Xô nợ (Debt Aging)
  getAllUnpaidOutboundsForAging: async (customerId?: string) => {
    const whereCondition: any = {
      status: { [Op.in]: ["unpaid", "partial"] },
      remainingAmount: { [Op.gt]: 0 },
    };

    if (customerId) {
      whereCondition.customerId = customerId;
    }

    return await OutboundHistory.findAll({
      where: whereCondition,
      attributes: [
        "outboundId",
        "outboundSlipCode",
        "customerId",
        "remainingAmount",
        "dueDate",
        "dateOutbound",
      ],
      raw: true,
    });
  },
};
