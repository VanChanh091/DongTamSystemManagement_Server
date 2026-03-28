import { Op, Transaction } from "sequelize";
import { Customer } from "../models/customer/customer";
import { CustomerPayment } from "../models/customer/customerPayment";

export const customerRepository = {
  //get all
  findAllCustomer: async () => {
    return await Customer.findAll({
      attributes: ["customerId", "customerName", "companyName"],
    });
  },

  //get by field
  findCustomerByPage: async ({
    page,
    pageSize,
    whereCondition = {},
  }: {
    page?: number;
    pageSize?: number;
    whereCondition?: any;
  }) => {
    const query: any = {
      where: whereCondition,
      attributes: { exclude: ["updatedAt"] },
      include: [
        {
          model: CustomerPayment,
          as: "payment",
          attributes: { exclude: ["createdAt", "updatedAt"] },
        },
      ],
      order: [["customerSeq", "ASC"]],
    };

    if (page && pageSize) {
      query.offset = (page - 1) * pageSize;
      query.limit = pageSize;
    }

    return await Customer.findAndCountAll(query);
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
  findCustomerByPk: async ({
    customerId,
    options = {},
  }: {
    customerId: string;
    options: { transaction?: Transaction; includePayment?: boolean };
  }) => {
    const includePayment = options.includePayment
      ? [
          {
            model: CustomerPayment,
            as: "payment",
            attributes: { exclude: ["createdAt", "updatedAt"] },
          },
        ]
      : [];
    return await Customer.findByPk(customerId, {
      attributes: { exclude: ["updatedAt"] },
      include: includePayment,
      transaction: options.transaction,
    });
  },

  updateCustomer: async (customer: Customer, customerData: any, transaction?: Transaction) => {
    return await customer.update(customerData, { transaction });
  },

  //find customer for meilisearch
  findCustomerForMeili: async (customerId: string, transaction: Transaction) => {
    return await Customer.findByPk(customerId, {
      attributes: ["customerId", "customerName", "companyName", "cskh", "phone", "customerSeq"],
      transaction,
    });
  },
};
