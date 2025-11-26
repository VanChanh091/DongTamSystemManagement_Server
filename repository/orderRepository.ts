import { FindOptions, Sequelize } from "sequelize";
import { Customer } from "../models/customer/customer";
import { Box } from "../models/order/box";
import { Product } from "../models/product/product";
import { User } from "../models/user/user";
import { Order } from "../models/order/order";

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
        //1. sort theo accept -> planning
        [Sequelize.literal(`CASE WHEN status = '${statusList[0]}' THEN 0 ELSE 1 END`), "ASC"],
        //2. sort theo 3 số đầu của orderId
        [Sequelize.literal("CAST(SUBSTRING_INDEX(`Order`.`orderId`, '/', 1) AS UNSIGNED)"), "ASC"],
        //3. nếu trùng orderId thì sort theo dateRequestShipping
        ["dateRequestShipping", "ASC"],
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
      ],
      order: [["createdAt", "DESC"]],
    });
  },
};
