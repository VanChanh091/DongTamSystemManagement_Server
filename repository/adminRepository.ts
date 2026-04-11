import { col, fn, Op, Sequelize, Transaction, where } from "sequelize";
import { Customer } from "../models/customer/customer";
import { Box } from "../models/order/box";
import { Order } from "../models/order/order";
import { Product } from "../models/product/product";
import { User } from "../models/user/user";
import { OrderImage } from "../models/order/orderImage";
import { CustomerPayment } from "../models/customer/customerPayment";

export const adminRepository = {
  //===============================ADMIN CRUD=====================================
  getAllItems: async ({ model }: { model: any }) => {
    return await model.findAll({ attributes: { exclude: ["createdAt", "updatedAt"] } });
  },

  getItemByPk: async ({ model, itemId }: { model: any; itemId: number }) => {
    return await model.findByPk(itemId);
  },

  createNewItem: async ({
    model,
    data,
    transaction,
  }: {
    model: any;
    data: any;
    transaction?: any;
  }) => {
    return await model.create(data, { transaction });
  },

  updateItem: async ({
    model,
    dataUpdated,
    transaction,
  }: {
    model: any;
    dataUpdated: any;
    transaction?: any;
  }) => {
    return await model.update(dataUpdated, { transaction });
  },

  deleteItem: async ({ model }: { model: any }) => {
    return await model.destroy();
  },

  //===============================ADMIN ORDER=====================================

  findOrderPending: async () => {
    return await Order.findAll({
      where: { status: "pending" },
      attributes: { exclude: ["createdAt", "updatedAt"] },
      include: [
        { model: Customer, attributes: ["customerName", "companyName"] },
        {
          model: Product,
          attributes: ["typeProduct", "productName", "maKhuon", "productImage"],
        },
        { model: Box, as: "box" },
        { model: OrderImage, attributes: ["imageUrl"] },
        { model: User, attributes: ["fullName"] },
      ],
      order: [["orderSortValue", "ASC"]],
    });
  },

  findByOrderId: async (orderId: string, transaction: Transaction) => {
    return await Order.findOne({
      where: { orderId },
      attributes: [
        "orderId",
        "totalPrice",
        "status",
        "rejectReason",
        "customerId",
        "productId",
        "userId",
        "quantityCustomer",
        "orderSortValue",
      ],
      include: [
        {
          model: Customer,
          attributes: ["customerId"],
          include: [
            { model: CustomerPayment, as: "payment", attributes: ["debtCurrent", "debtLimit"] },
          ],
        },
        {
          model: Product,
          attributes: ["productId", "typeProduct"],
        },
        { model: Box, as: "box" },
        { model: User, attributes: ["fullName"] },
      ],
      transaction,
    });
  },

  updateDebtCustomer: async (customer: any, newDebt: number) => {
    return await customer.update({ debtCurrent: newDebt });
  },

  //===============================ADMIN USER=====================================

  getAllUser: async () => {
    return await User.findAll({ attributes: { exclude: ["password", "createdAt", "updatedAt"] } });
  },

  getUserByName: async (nameLower: string) => {
    return await User.findAll({
      where: where(fn("LOWER", col("fullName")), {
        [Op.like]: `%${nameLower}%`,
      }),
      attributes: { exclude: ["password"] },
    });
  },

  getUserByPhone: async (phone: string) => {
    return await User.findAll({
      where: { phone },
      attributes: { exclude: ["password"] },
    });
  },

  getUserByPk: async (userId: number) => {
    return await User.findByPk(userId);
  },
};
