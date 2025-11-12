import { Sequelize } from "sequelize";
import { Customer } from "../models/customer/customer";

export const customerRepository = {
  customerCount: async () => {
    return await Customer.count();
  },

  findAllCustomer: async () => {
    return await Customer.findAll({
      attributes: { exclude: ["createdAt", "updatedAt"] },
    });
  },

  findCustomerByPage: async (page: number, pageSize: number) => {
    return await Customer.findAll({
      attributes: { exclude: ["createdAt", "updatedAt"] },
      offset: (page - 1) * pageSize,
      limit: pageSize,
      order: [
        //lấy 4 số cuối -> ép chuỗi thành số để so sánh -> sort
        [Sequelize.literal("CAST(RIGHT(`Customer`.`customerId`, 4) AS UNSIGNED)"), "ASC"],
      ],
    });
  },
};
