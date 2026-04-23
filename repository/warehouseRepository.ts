import { Box } from "../models/order/box";
import { User } from "../models/user/user";
import { Order } from "../models/order/order";
import { Product } from "../models/product/product";
import { Op, Sequelize, Transaction } from "sequelize";
import { Customer } from "../models/customer/customer";
import { InboundSumByPlanning } from "../interface/types";
import { Inventory } from "../models/warehouse/inventory/inventory";
import { PlanningBox } from "../models/planning/planningBox";
import { QcSession } from "../models/qualityControl/qcSession";
import { PlanningPaper } from "../models/planning/planningPaper";
import { InboundHistory } from "../models/warehouse/inboundHistory";
import { OutboundDetail } from "../models/warehouse/outboundDetail";
import { OutboundHistory } from "../models/warehouse/outboundHistory";
import { PlanningBoxTime } from "../models/planning/planningBoxMachineTime";
import { timeOverflowPlanning } from "../models/planning/timeOverflowPlanning";

export const warehouseRepository = {
  //====================================WAITING CHECK========================================

  //paper
  getPaperWaitingChecked: async () => {
    const paper = await PlanningPaper.findAll({
      where: {
        hasBox: false,
        qtyProduced: { [Op.ne]: 0 },
        statusRequest: { [Op.in]: ["requested", "inbounded"] },
      },
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

    return paper.filter((paper) => {
      const totalInbound = paper.inbound.reduce((sum, inbound) => sum + inbound.qtyInbound, 0);
      return (paper.qtyProduced ?? 0) > totalInbound;
    });
  },

  //box
  getBoxWaitingChecked: async () => {
    const box = await PlanningBox.findAll({
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
        { model: PlanningBoxTime, as: "boxTimes", attributes: ["machine", "qtyProduced"] },
        { model: InboundHistory, as: "inbound", attributes: ["dateInbound", "qtyInbound"] },
      ],
    });

    return box.filter((box) => {
      const totalInbound = box.inbound.reduce((sum, inbound) => sum + inbound.qtyInbound, 0);

      //tìm min qtyProduced của boxTimes
      const qtyProduced = box.boxTimes?.map((bt) => bt.qtyProduced ?? 0) ?? [];
      const minQtyProduced = qtyProduced.length > 0 ? Math.min(...qtyProduced) : 0;

      return minQtyProduced > totalInbound;
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

  getInboundSumByPlanning: async (
    key: "planningId" | "planningBoxId",
    ids: number[],
  ): Promise<InboundSumByPlanning[]> => {
    if (!ids.length) return [];

    const rows = await InboundHistory.findAll({
      attributes: [key, [Sequelize.fn("SUM", Sequelize.col("qtyInbound")), "totalInbound"]],
      where: { [key]: ids },
      group: [key],
      raw: true,
    });

    return rows as unknown as InboundSumByPlanning[];
  },

  findInboundByPage: async ({
    page = 1,
    pageSize = 20,
    whereCondition,
  }: {
    page?: number;
    pageSize?: number;
    whereCondition?: any;
  }) => {
    const query: any = {
      where: whereCondition,
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
        { model: QcSession, attributes: ["checkedBy"] },
      ],
      order: [["dateInbound", "DESC"]],
    };

    if (page && pageSize) {
      query.offset = (page - 1) * pageSize;
      query.limit = pageSize;
    }

    return await InboundHistory.findAndCountAll(query);
  },

  syncInbound: async (inboundId: number, transaction: Transaction) => {
    return await InboundHistory.findByPk(inboundId, {
      attributes: ["inboundId", "dateInbound"],
      include: [
        {
          model: Order,
          attributes: ["orderId"],
          include: [{ model: Customer, attributes: ["customerName"] }],
        },
        { model: QcSession, attributes: ["checkedBy"] },
      ],
      transaction,
    });
  },

  //====================================OUTBOUND HISTORY========================================

  getOutboundByPage: async ({
    page = 1,
    pageSize = 20,
    whereCondition,
  }: {
    page?: number;
    pageSize?: number;
    whereCondition?: any;
  }) => {
    const query: any = {
      where: whereCondition,
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

    if (page && pageSize) {
      query.offset = (page - 1) * pageSize;
      query.limit = pageSize;
    }

    return await OutboundHistory.findAndCountAll(query);
  },

  getOutboundForMeili: async (outboundId: number, transaction: Transaction) => {
    return await OutboundHistory.findByPk(outboundId, {
      attributes: ["outboundId", "outboundSlipCode", "dateOutbound"],
      include: [
        {
          model: OutboundDetail,
          as: "detail",
          attributes: ["outboundDetailId"],
          include: [
            {
              model: Order,
              attributes: ["orderId"],
              include: [{ model: Customer, attributes: ["customerName"] }],
            },
          ],
        },
      ],
      transaction,
    });
  },

  getOutboundDetail: async (outboundId: number) => {
    return await OutboundDetail.findAll({
      attributes: { exclude: ["createdAt", "updatedAt"] },
      where: { outboundId },
      include: [
        {
          model: Order,
          attributes: [
            "dayReceiveOrder",
            "flute",
            "QC_box",
            "lengthPaperCustomer",
            "paperSizeCustomer",
            "quantityCustomer",
            "dvt",
            "discount",
          ],
          include: [
            { model: Customer, attributes: ["customerName", "companyName"] },
            { model: Product, attributes: ["typeProduct", "productName"] },
            { model: Inventory, attributes: ["qtyInventory"] },
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
        "vat",
        "lengthPaperManufacture",
        "paperSizeManufacture",
      ],
      include: [
        { model: Customer, attributes: ["customerName"] },
        { model: Product, attributes: ["typeProduct", "productName"] },
        { model: User, attributes: ["fullName"] },
      ],
    });
  },

  searchOrderIds: async (keyword: string) => {
    return await Order.findAll({
      where: { orderId: { [Op.startsWith]: keyword } },
      attributes: ["orderId", "dayReceiveOrder"],
      include: [
        { model: Customer, attributes: ["customerName"] },
        // {
        //   model: InboundHistory,
        //   attributes: ['qtyInbound'],
        //   required: true,
        //   where: { qtyInbound: { [Op.gt]: 0 } },
        // },
        {
          model: Inventory,
          attributes: ["qtyInventory"],
          required: true,
          where: { qtyInventory: { [Op.ne]: 0 } },
        },
      ],
      limit: 20,
      order: [["orderId", "ASC"]],
    });
  },

  sumOutboundQty: async ({
    orderId,
    transaction,
  }: {
    orderId: string;
    transaction: Transaction;
  }) => {
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
    transaction?: Transaction;
  }) => {
    return await OutboundDetail.sum("outboundQty", {
      where: {
        orderId,
        outboundId: { [Op.ne]: outboundId },
      },
      transaction,
    });
  },

  findOneForExportPDF: async (outboundId: number) => {
    return await OutboundHistory.findByPk(outboundId, {
      attributes: { exclude: ["createdAt", "updatedAt", "totalOutboundQty"] },
      include: [
        {
          model: OutboundDetail,
          as: "detail",
          attributes: { exclude: ["createdAt", "updatedAt", "deliveredQty", "outboundId"] },
          include: [
            {
              model: Order,
              attributes: [
                "orderId",
                "flute",
                "QC_box",
                "quantityCustomer",
                "lengthPaperCustomer",
                "paperSizeCustomer",
                "dvt",
                "discount",
                "vat",
                "pricePaper",
              ],
              include: [
                {
                  model: Customer,
                  attributes: ["customerName", "companyName", "companyAddress", "mst", "phone"],
                },
                { model: Product, attributes: ["typeProduct", "productName"] },
                { model: User, attributes: ["fullName"] },
              ],
            },
          ],
        },
      ],
    });
  },
};
