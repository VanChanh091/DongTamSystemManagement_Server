import { col, fn, Op, Sequelize, where } from "sequelize";
import { Customer } from "../models/customer/customer";
import { Box } from "../models/order/box";
import { Order } from "../models/order/order";
import { Product } from "../models/product/product";
import { User } from "../models/user/user";

export const adminRepository = {
  //===============================ADMIN MACHINE=====================================

  getAllMachine: async (model: any) => {
    return await model.findAll({ attributes: { exclude: ["createdAt", "updatedAt"] } });
  },

  getMachineByPk: async (model: any, machineId: number) => {
    return await model.findByPk(machineId);
  },

  createMachine: async (model: any, data: any, transaction?: any) => {
    return await model.create(data, { transaction });
  },

  updateMachine: async (machine: any, machineUpdated: any) => {
    return await machine.update(machineUpdated);
  },

  deleteMachine: async (machine: any) => {
    return await machine.destroy();
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
        { model: User, attributes: ["fullName"] },
      ],
      order: [
        //lấy 3 số đầu tiên -> ép chuỗi thành số để so sánh -> sort
        [Sequelize.literal("CAST(SUBSTRING_INDEX(`Order`.`orderId`, '/', 1) AS UNSIGNED)"), "ASC"],
        [Sequelize.col("Order.createdAt"), "ASC"], // nếu trùng thì sort theo ngày tạo (tạo trước lên trên)
      ],
    });
  },

  findByOrderId: async (orderId: string) => {
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
      ],
      include: [
        {
          model: Customer,
          attributes: ["customerId", "debtCurrent", "debtLimit"],
        },
        {
          model: Product,
          attributes: ["productId", "typeProduct"],
        },
        { model: Box, as: "box" },
        { model: User, attributes: ["fullName"] },
      ],
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

  //===============================ADMIN WASTE=====================================

  getAllWaste: async (model: any) => {
    return await model.findAll({ attributes: { exclude: ["createdAt", "updatedAt"] } });
  },

  getWasteByPk: async (model: any, wasteId: number) => {
    return await model.findByPk(wasteId);
  },

  createWaste: async (model: any, wasteData: any, transaction?: any) => {
    return await model.create(wasteData, { transaction });
  },

  updateWaste: async (wasteModel: any, wasteDataUpdated: any) => {
    return await wasteModel.update(wasteDataUpdated);
  },
};
