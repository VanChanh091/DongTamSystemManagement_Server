import { Op, Sequelize, Transaction } from "sequelize";
import { Customer } from "../models/customer/customer";

export const customerRepository = {
  //get all
  customerCount: async () => {
    return await Customer.count();
  },

  findAllCustomer: async () => {
    return await Customer.findAll({
      attributes: { exclude: ["createdAt", "updatedAt"] },
    });
  },

  //get by field
  findCustomerByPage: async (page: number, pageSize: number) => {
    return await Customer.findAll({
      attributes: { exclude: ["createdAt", "updatedAt"] },
      offset: (page - 1) * pageSize,
      limit: pageSize,
      order: [["customerSeq", "ASC"]],
    });
  },

  findByIdOrMst: async (sanitizedPrefix: string, mst: string, transaction?: Transaction) => {
    return await Customer.findAll({
      where: {
        [Op.or]: [{ customerId: { [Op.like]: `${sanitizedPrefix}%` } }, { mst }],
      },
      attributes: ["customerId", "mst"],
      transaction,
    });
  },

  //create
  createCustomer: async (data: any, transaction?: Transaction) => {
    return await Customer.create(data, { transaction });
  },

  //update
  findByCustomerId: async (customerId: string, transaction?: Transaction) => {
    return await Customer.findOne({ where: { customerId }, transaction });
  },

  updateCustomer: async (customer: any, customerData: any, transaction?: Transaction) => {
    return await customer.update(customerData, { transaction });
  },

  //delete
  deleteCustomer: async (customerId: string, transaction?: Transaction) => {
    return await Customer.destroy({
      where: { customerId },
      transaction,
    });
  },

  //export
  findAllForExport: async (whereCondition: any = {}) => {
    return await Customer.findAll({
      where: whereCondition,
      attributes: { exclude: ["createdAt", "updatedAt"] },
      order: [
        //lấy 4 số cuối -> ép chuỗi thành số để so sánh -> sort
        [Sequelize.literal("CAST(RIGHT(`Customer`.`customerId`, 4) AS UNSIGNED)"), "ASC"],
      ],
    });
  },
};
