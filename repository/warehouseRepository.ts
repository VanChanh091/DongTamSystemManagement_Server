import { InboundHistory } from "../models/warehouse/inboundHistory";
import { Order } from "../models/order/order";
import { Customer } from "../models/customer/customer";
import { Product } from "../models/product/product";
import { PlanningPaper } from "../models/planning/planningPaper";
import { timeOverflowPlanning } from "../models/planning/timeOverflowPlanning";
import { Box } from "../models/order/box";
import { PlanningBox } from "../models/planning/planningBox";
import { PlanningBoxTime } from "../models/planning/planningBoxMachineTime";
import { OutboundHistory } from "../models/warehouse/outboundHistory";
import { OutboundDetail } from "../models/warehouse/outboundDetail";
import { Op } from "sequelize";
import { User } from "../models/user/user";
import { Inventory } from "../models/warehouse/inventory";

export const warehouseRepository = {
  //====================================WAITING CHECK========================================

  //paper
  getPaperWaitingChecked: async () => {
    return await PlanningPaper.findAll({
      where: { statusRequest: { [Op.in]: ["requested", "inbounded"] }, hasBox: false },
      attributes: { exclude: ["createdAt", "updatedAt"] },
      include: [
        {
          model: timeOverflowPlanning,
          as: "timeOverFlow",
          attributes: { exclude: ["createdAt", "updatedAt", "status"] },
        },
        {
          model: Order,
          where: { isBox: false },
          attributes: [
            "orderId",
            "dayReceiveOrder",
            "flute",
            "QC_box",
            "canLan",
            "daoXa",
            "quantityManufacture",
            "dateRequestShipping",
            "instructSpecial",
            "isBox",
            "customerId",
            "productId",
          ],
          include: [
            { model: Customer, attributes: ["customerName", "companyName"] },
            {
              model: Box,
              as: "box",
              attributes: { exclude: ["createdAt", "updatedAt", "orderId"] },
            },
          ],
        },
        { model: InboundHistory, as: "inbound", attributes: ["dateInbound", "qtyInbound"] },
      ],
      order: [["sortPlanning", "ASC"]],
    });
  },

  //box
  getBoxWaitingChecked: async () => {
    return await PlanningBox.findAll({
      where: { statusRequest: { [Op.in]: ["requested", "inbounded"] } },
      attributes: {
        exclude: [
          "hasIn",
          "hasBe",
          "hasXa",
          "hasDan",
          "hasCanLan",
          "hasCatKhe",
          "hasCanMang",
          "hasDongGhim",
          "hasOverFlow",
          "isRequestCheck",
          "createdAt",
          "updatedAt",
        ],
      },
      include: [
        {
          model: Order,
          attributes: [
            "orderId",
            "dayReceiveOrder",
            "flute",
            "QC_box",
            "numberChild",
            "dateRequestShipping",
            "customerId",
            "productId",
            "quantityCustomer",
          ],
          include: [
            {
              model: Customer,
              attributes: ["customerName", "companyName"],
            },
            {
              model: Box,
              as: "box",
              attributes: { exclude: ["createdAt", "updatedAt", "orderId"] },
            },
          ],
        },
        { model: InboundHistory, as: "inbound", attributes: ["dateInbound", "qtyInbound"] },
      ],
    });
  },

  getBoxCheckedDetail: async (planningBoxId: number) => {
    return await PlanningBox.findByPk(planningBoxId, {
      attributes: ["planningBoxId", "qtyPaper", "hasOverFlow", "orderId", "planningId"],
      include: [
        {
          model: PlanningBoxTime,
          as: "boxTimes",
          attributes: {
            exclude: ["createdAt", "updatedAt", "boxTimeId", "status", "sortPlanning"],
          },
        },
      ],
    });
  },

  //====================================INBOUND HISTORY========================================

  inboundHistoryCount: async () => {
    return await InboundHistory.count();
  },

  findAllInbound: async (orderId: string) => {
    return await InboundHistory.findAll({
      where: { orderId },
      attributes: ["qtyInbound"],
    });
  },

  findInboundByPage: async ({
    page = 1,
    pageSize = 20,
    paginate = true,
  }: {
    page?: number;
    pageSize?: number;
    paginate?: boolean;
  }) => {
    const query: any = {
      attributes: { exclude: ["createdAt", "updatedAt"] },
      include: [
        {
          model: Order,
          attributes: [
            "QC_box",
            "day",
            "flute",
            "matE",
            "matB",
            "matC",
            "matE2",
            "songE",
            "songB",
            "songC",
            "songE2",
            "dayReceiveOrder",
            "lengthPaperCustomer",
            "paperSizeCustomer",
            "quantityCustomer",
          ],
          include: [
            { model: Customer, attributes: ["customerName", "companyName"] },
            { model: Product, attributes: ["typeProduct", "productName"] },
          ],
        },
      ],
      order: [["dateInbound", "DESC"]],
    };

    if (paginate) {
      query.offset = (page - 1) * pageSize;
      query.limit = pageSize;
    }

    return await InboundHistory.findAll(query);
  },

  //====================================OUTBOUND HISTORY========================================

  outboundHistoryCount: async () => {
    return await OutboundHistory.count();
  },

  getOutboundByPage: async ({
    page = 1,
    pageSize = 20,
    paginate = true,
  }: {
    page?: number;
    pageSize?: number;
    paginate?: boolean;
  }) => {
    const query: any = {
      attributes: { exclude: ["createdAt", "updatedAt"] },
      include: [
        {
          model: OutboundDetail,
          as: "detail",
          attributes: ["outboundDetailId", "orderId"],
          separate: true,
          limit: 1,
          include: [
            {
              model: Order,
              attributes: ["orderId", "dayReceiveOrder"],
              include: [{ model: Customer, attributes: ["customerName", "companyName"] }],
            },
          ],
        },
      ],
      order: [["dateOutbound", "DESC"]],
    };

    if (paginate) {
      query.offset = (page - 1) * pageSize;
      query.limit = pageSize;
    }

    return await OutboundHistory.findAll(query);
  },

  getOutboundDetail: async (outboundId: number) => {
    return await OutboundDetail.findAll({
      attributes: { exclude: ["createdAt", "updatedAt"] },
      where: { outboundId },
      include: [
        {
          model: Order,
          attributes: ["dayReceiveOrder", "flute", "QC_box", "quantityCustomer", "dvt", "discount"],
          include: [
            { model: Customer, attributes: ["customerName", "companyName"] },
            { model: Product, attributes: ["typeProduct", "productName"] },
          ],
        },
      ],
    });
  },

  findByPK: async (outboundId: number) => {
    return await OutboundHistory.findByPk(outboundId, {
      attributes: ["outboundId"],
    });
  },

  getOrderInboundQty: async (orderId: string) => {
    return await Order.findOne({
      where: { orderId },
      attributes: [
        "orderId",
        "dayReceiveOrder",
        "flute",
        "QC_box",
        "quantityCustomer",
        "dvt",
        "pricePaper",
        "discount",
        "vat",
      ],
      include: [
        { model: Customer, attributes: ["customerName", "companyName"] },
        { model: Product, attributes: ["typeProduct", "productName"] },
        { model: User, attributes: ["fullName"] },
      ],
    });
  },

  searchOrderIds: async (keyword: string) => {
    return await Order.findAll({
      where: {
        orderId: {
          [Op.startsWith]: keyword,
        },
      },
      attributes: ["orderId", "dayReceiveOrder"],
      include: [
        { model: Customer, attributes: ["customerName"] },
        {
          model: InboundHistory,
          attributes: [],
          required: true,
          where: { qtyInbound: { [Op.gt]: 0 } },
        },
      ],
      limit: 20,
      order: [["orderId", "ASC"]],
    });
  },

  sumOutboundQty: async ({ orderId, transaction }: { orderId: string; transaction: any }) => {
    return await OutboundDetail.sum("outboundQty", {
      where: { orderId },
      transaction,
    });
  },

  sumOutboundQtyExcludeOutbound: async ({
    orderId,
    outboundId,
    transaction,
  }: {
    orderId: string;
    outboundId: number;
    transaction?: any;
  }) => {
    return await OutboundDetail.sum("outboundQty", {
      where: {
        orderId,
        outboundId: { [Op.ne]: outboundId },
      },
      transaction,
    });
  },

  //====================================INVENTORY========================================

  inventoryCount: async () => {
    return await Inventory.count();
  },

  getInventoryByPage: async (page: number, pageSize: number) => {
    return await Inventory.findAll({
      attributes: { exclude: ["createdAt", "updatedAt"] },
      include: [
        {
          model: Order,
          attributes: [
            "orderId",
            "dayReceiveOrder",
            "flute",
            "day",
            "matE",
            "matB",
            "matC",
            "matE2",
            "songE",
            "songB",
            "songC",
            "songE2",
            "lengthPaperCustomer",
            "paperSizeCustomer",
            "quantityCustomer",
            "dvt",
            "pricePaper",
            "totalPrice",
            "vat",
            "totalPriceVAT",
          ],
        },
      ],
      offset: (page - 1) * pageSize,
      limit: pageSize,
    });
  },

  findInventoryByOrderId: async (orderId: string) => {
    return await Inventory.findOne({
      where: { orderId },
      attributes: ["qtyInventory"],
    });
  },

  findByOrderId: async ({ orderId, transaction }: { orderId: string; transaction: any }) => {
    return await Inventory.findOne({
      where: { orderId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
  },
};
