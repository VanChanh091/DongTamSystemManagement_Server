import { FindOptions, Op } from "sequelize";
import { Customer } from "../models/customer/customer";
import { Box } from "../models/order/box";
import { Product } from "../models/product/product";
import { User } from "../models/user/user";
import { Order } from "../models/order/order";
import { FluteRatio } from "../models/admin/fluteRatio";

export const orderRepository = {
  buildQueryOptions: (whereCondition: any = {}, statusList: string[]): FindOptions => {
    return {
      where: whereCondition,
      attributes: { exclude: ["createdAt", "updatedAt"] },

      include: [
        { model: Customer, attributes: ["customerName", "companyName"] },
        { model: Product, attributes: ["typeProduct", "productName", "maKhuon"] },
        { model: Box, as: "box", attributes: { exclude: ["createdAt", "updatedAt"] } },
        { model: User, attributes: ["fullName"] },
      ],

      order: [
        //1. sort theo accept -> planning | pending -> reject
        ["statusPriority", "ASC"],
        //2. sort theo orderId
        ["orderSortValue", "ASC"],
      ],
    };
  },

  findAndCountAll: (queryOptions: any) => {
    return Order.findAndCountAll(queryOptions);
  },

  findAll: (queryOptions: any) => {
    return Order.findAll(queryOptions);
  },

  findAllFilter: async (whereCondition: any = {}) => {
    return await Order.findAll({
      where: whereCondition,
      include: [
        { model: Customer, attributes: ["customerName", "companyName"] },
        {
          model: Product,
          attributes: ["typeProduct", "productName", "maKhuon"],
        },
        {
          model: Box,
          as: "box",
          attributes: {
            exclude: ["boxId", "createdAt", "updatedAt", "orderId"],
          },
        },
        { model: User, attributes: ["fullName"] },
      ],
      order: [["createdAt", "DESC"]],
    });
  },

  findOneFluteRatio: async (flute: string) => {
    return await FluteRatio.findOne({ where: { fluteName: flute }, attributes: ["ratio"] });
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
          "createdAt",
          "updatedAt",
        ],
      },
      include: [
        {
          model: Product,
          attributes: ["maKhuon"],
        },
        {
          model: Box,
          as: "box",
          attributes: {
            exclude: ["boxId", "createdAt", "updatedAt", "orderId"],
          },
        },
      ],
    });
  },
};
