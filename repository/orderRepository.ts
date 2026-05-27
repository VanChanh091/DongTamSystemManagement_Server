import { FindOptions, Op, Transaction } from "sequelize";
import { Customer } from "../models/customer/customer";
import { Box } from "../models/order/box";
import { Product } from "../models/product/product";
import { User } from "../models/user/user";
import { Order } from "../models/order/order";
import { FluteRatio } from "../models/admin/fluteRatio";
import { OrderImage } from "../models/order/orderImage";
import { PlanningPaper } from "../models/planning/planningPaper";

export const orderRepository = {
  buildOrdersOptions: ({
    whereCondition = {},
    isExport = false,
  }: {
    whereCondition: any;
    isExport?: boolean;
  }): FindOptions => {
    const queryOptions: FindOptions = {
      where: whereCondition,
      attributes: { exclude: ["createdAt", "updatedAt"] },

      include: [
        { model: Customer, attributes: ["customerName", "companyName"] },
        { model: Product, attributes: ["typeProduct", "productName", "maKhuon"] },
        { model: Box, as: "box", attributes: { exclude: ["createdAt", "updatedAt"] } },
        { model: OrderImage, attributes: ["imageUrl"] },
        { model: User, attributes: ["fullName"] },
        { model: PlanningPaper, attributes: ["planningId"], required: false },
      ],

      order: [
        // sort theo accept -> planning | pending -> reject
        ["statusPriority", "DESC"],
        // sort theo orderId
        ["orderSortValue", "ASC"],
      ],
    };

    if (isExport) {
      queryOptions.raw = true;
      queryOptions.nest = true;
    }

    return queryOptions;
  },

  findOneFluteRatio: async (flute: string, transaction?: Transaction) => {
    return await FluteRatio.findOne({
      where: { fluteName: flute },
      attributes: ["ratio"],
      transaction,
    });
  },

  //repo for auto complete
  getOrderIdRaw: async (orderId: string) => {
    return await Order.findAll({
      where: { orderId: { [Op.like]: `%${orderId}%` } },
      attributes: ["orderId", "dayReceiveOrder"],
      include: [{ model: Customer, attributes: ["customerName"] }],
      limit: 15,
    });
  },

  getOrderDetail: async (orderId: string) => {
    return await Order.findOne({
      where: { orderId },
      attributes: {
        exclude: [
          "flute",
          "acreage",
          "totalPrice",
          "totalPriceVAT",
          "status",
          "rejectReason",
          "volume",
          "orderSortValue",
          "statusPriority",
          "createdAt",
          "updatedAt",
        ],
      },
      include: [
        { model: Customer, attributes: ["customerName"] },
        { model: Product, attributes: ["maKhuon"] },
        {
          model: Box,
          as: "box",
          attributes: { exclude: ["boxId", "createdAt", "updatedAt", "orderId"] },
        },
      ],
    });
  },

  //------------------------MEILISEARCH-----------------------------
  buildMeiliOrderOptions: ({
    whereCondition,
    transaction,
  }: {
    whereCondition?: any;
    transaction?: Transaction;
  }): FindOptions => {
    const queryOptions: FindOptions = {
      where: whereCondition,
      attributes: [
        "orderId",
        "dayReceiveOrder",
        "flute",
        "QC_box",
        "status",
        "userId",
        "orderSortValue",
      ],
      include: [
        { model: Customer, attributes: ["customerName"] },
        { model: Product, attributes: ["productName"] },
      ],
      transaction,
    };

    return queryOptions;
  },

  syncOrderForMeili: async (orderId: string, transaction: Transaction) => {
    return await Order.findOne(
      orderRepository.buildMeiliOrderOptions({ whereCondition: { orderId }, transaction }),
    );
  },

  syncOrdersForMeili: async (orderId: string[], transaction: Transaction) => {
    return await Order.findAll(
      orderRepository.buildMeiliOrderOptions({
        whereCondition: { orderId: { [Op.in]: orderId } },
        transaction,
      }),
    );
  },

  syncAllOrdersForMeili: async () => {
    return await Order.findAll(orderRepository.buildMeiliOrderOptions({}));
  },
};
