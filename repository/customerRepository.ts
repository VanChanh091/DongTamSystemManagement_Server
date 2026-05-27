import { FindOptions, Op, Transaction } from "sequelize";
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
  buildCustomersOptions: ({
    page,
    pageSize,
    whereCondition,
    isExport = false,
  }: {
    page?: number;
    pageSize?: number;
    whereCondition?: any;
    isExport?: boolean;
  }): FindOptions => {
    const queryOptions: FindOptions = {
      where: whereCondition,
      attributes: { exclude: ["updatedAt"] },
      include: [
        {
          model: CustomerPayment,
          as: "payment",
          attributes: { exclude: ["createdAt", "updatedAt"] },
        },
      ],
    };

    if (page && pageSize) {
      queryOptions.offset = (page - 1) * pageSize;
      queryOptions.limit = pageSize;

      queryOptions.order = [["customerSeq", "ASC"]];
    }

    if (isExport) {
      queryOptions.raw = true;
      queryOptions.nest = true;
    }

    return queryOptions;
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

  findCusPaymentByPk: async (customerId: string, transaction: Transaction) => {
    return await Customer.findByPk(customerId, {
      attributes: ["customerId"],
      include: [
        {
          model: CustomerPayment,
          as: "payment",
          attributes: ["cusPaymentId", "timePayment"],
        },
      ],
      transaction,
    });
  },

  //------------------------MEILISEARCH-----------------------------
  buildMeiliCustomerOptions: ({
    whereCondition,
    transaction,
  }: {
    whereCondition?: any;
    transaction?: Transaction;
  }): FindOptions => {
    const queryOptions: FindOptions = {
      where: whereCondition,
      attributes: [
        "customerId",
        "customerName",
        "companyName",
        "cskh",
        "phone",
        "dayCreated",
        "customerSeq",
      ],
      order: [["customerSeq", "ASC"]],
      transaction,
    };

    return queryOptions;
  },

  syncCustomerForMeili: async (customerId: string, transaction: Transaction) => {
    return await Customer.findOne(
      customerRepository.buildMeiliCustomerOptions({ whereCondition: { customerId }, transaction }),
    );
  },

  syncAllCustomersForMeili: async () => {
    return await Customer.findAll(customerRepository.buildMeiliCustomerOptions({}));
  },
};
