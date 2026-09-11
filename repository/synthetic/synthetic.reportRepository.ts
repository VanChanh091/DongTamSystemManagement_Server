import { Op } from "sequelize";
import { Order } from "../../models/order/order";
import { Customer } from "../../models/customer/customer";
import { OrderApproved } from "../../models/order/orderApproved";
import { InboundHistory } from "../../models/warehouse/inboundHistory";
import { OutboundDetail } from "../../models/warehouse/outbound/outboundDetail";
import { OutboundHistory } from "../../models/warehouse/outbound/outboundHistory";

export const syntheticReportRepository = {
  //====================================REVENUE DAY========================================
  getRawOutboundByCustomer: async ({
    startDate,
    endDate,
    userId,
  }: {
    startDate: string | Date;
    endDate: string | Date;
    userId?: number;
  }) => {
    return OutboundHistory.findAll({
      attributes: ["customerId", "dateOutbound", "totalPricePayment"],
      where: { dateOutbound: { [Op.between]: [startDate, endDate] } },
      include: [
        {
          model: Customer,
          required: true,
          attributes: ["customerId", "customerName", "companyName"],
          where: userId ? { userId } : undefined,
        },
      ],
      raw: true,
      nest: true,
    });
  },

  //====================================REVENUE MONTH======================================
  // gom nhóm theo ngày duyệt và lấy các đơn được duyệt mới nhất
  getDailyApprovedOrders: async ({
    startDate,
    endDate,
    userId,
  }: {
    startDate: string | Date;
    endDate: string | Date;
    userId?: number;
  }) => {
    return OrderApproved.findAll({
      attributes: ["orderId", "createdAt"],
      where: {
        action: "APPROVED",
        createdAt: { [Op.between]: [startDate, endDate] },
      },
      include: [
        {
          model: Order,
          required: true,
          attributes: ["totalPrice"],
          where: {
            ...(userId ? { userId } : {}),
            status: { [Op.in]: ["accept", "planning", "completed"] },
          },
        },
      ],
      order: [["approverId", "DESC"]],
      raw: true,
      nest: true,
    });
  },

  //gom nhóm theo ngày nhập kho
  getDailyProductionInbound: async ({
    startDate,
    endDate,
    userId,
  }: {
    startDate: string | Date;
    endDate: string | Date;
    userId?: number;
  }) => {
    return InboundHistory.findAll({
      attributes: ["totalPrice", "createdAt"],
      where: { createdAt: { [Op.between]: [startDate, endDate] } },
      include: [
        {
          model: Order,
          required: true,
          attributes: [],
          where: {
            ...(userId ? { userId } : {}),
            status: { [Op.in]: ["accept", "planning", "completed"] },
          },
        },
      ],

      raw: true,
    });
  },

  //gom nhóm theo chi tiết xuất kho
  getDailyProductionOutbound: async ({
    startDate,
    endDate,
    userId,
  }: {
    startDate: string | Date;
    endDate: string | Date;
    userId?: number;
  }) => {
    return OutboundDetail.findAll({
      attributes: ["totalPriceOutbound", "createdAt"],
      where: { createdAt: { [Op.between]: [startDate, endDate] } },
      include: [
        {
          model: Order,
          required: true,
          attributes: [],
          where: {
            ...(userId ? { userId } : {}),
            status: { [Op.in]: ["accept", "planning", "completed"] },
          },
        },
      ],
      raw: true,
    });
  },

  //====================================REVENUE YEAR=======================================
  getRawOutboundMultiYear: async ({
    startDate,
    endDate,
    userId,
  }: {
    startDate: string;
    endDate: string;
    userId?: number | null;
  }) => {
    return OutboundHistory.findAll({
      attributes: ["customerId", "dateOutbound", "totalPricePayment"],
      where: {
        dateOutbound: { [Op.between]: [startDate, endDate] },
        totalPricePayment: { [Op.gt]: 0 },
      },
      include: [
        {
          model: Customer,
          required: true,
          attributes: ["customerId", "customerName"],
          where: userId ? { userId } : undefined,
        },
      ],
      raw: true,
      nest: true,
    });
  },
};
