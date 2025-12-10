import { Op } from "sequelize";
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

export const warehouseRepository = {
  //====================================WAITING CHECK========================================

  //paper
  getPaperWaitingChecked: async () => {
    return await PlanningPaper.findAll({
      where: { dayStart: { [Op.ne]: null }, qtyProduced: { [Op.gt]: 0 } },
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
      ],
      order: [["sortPlanning", "ASC"]],
    });
  },

  //box
  getBoxWaitingChecked: async () => {
    return await PlanningBox.findAll({
      where: { isRequestCheck: true },
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

  findOutboundByPage: async ({
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
          attributes: {
            exclude: [
              "dayReceiveOrder",
              "flute",
              "canLan",
              "daoXa",
              "lengthPaperManufacture",
              "paperSizeManufacture",
              "quantityManufacture",
              "numberChild",
              "acreage",
              "dvt",
              "price",
              "pricePaper",
              "discount",
              "profit",
              "dateRequestShipping",
              "instructSpecial",
              "isBox",
              "status",
              "rejectReason",
              "userId",
            ],
          },
          include: [
            { model: Customer, attributes: ["customerName", "companyName"] },
            { model: Product, attributes: ["typeProduct", "productName"] },
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
};
