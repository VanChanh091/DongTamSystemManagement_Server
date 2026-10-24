import { FindOptions, Includeable, Op, Transaction } from "sequelize";
import { DebtDeductionRequest } from "../models/debt/debtDeductionRequest";
import { Customer } from "../models/customer/customer";

export const debtDeductionRepository = {
  buildDebtDeductionOptions: ({
    page,
    pageSize,
    isExport = false,
    status,
    filterUserId,
    customerId,
  }: {
    page: number;
    pageSize: number;
    isExport?: boolean;
    status?: string[];
    filterUserId?: number;
    customerId?: string;
  }) => {
    const debtCondition: any = { status: { [Op.in]: status } };

    if (customerId) debtCondition.customerId = customerId;
    if (filterUserId) debtCondition.userId = filterUserId;

    const queryOptions: FindOptions = {
      where: debtCondition,
      attributes: { exclude: ["updatedAt"] },
      include: [{ model: Customer, attributes: ["customerId", "customerName"] }],
    };

    if (!isExport && page && pageSize) {
      queryOptions.offset = (page - 1) * pageSize;
      queryOptions.limit = pageSize;
      queryOptions.order = [["createdAt", "DESC"]];
    }

    if (isExport) {
      queryOptions.raw = true;
      queryOptions.nest = true;
    }

    return queryOptions;
  },

  getDebtDeductionById: async ({
    requestId,
    options,
  }: {
    requestId: number;
    options?: {
      transaction?: Transaction;
      lock?: FindOptions["lock"];
      includeCustomer?: boolean;
    };
  }) => {
    const include: Includeable[] = [];
    if (options?.includeCustomer) {
      include.push({
        model: Customer,
        attributes: ["customerId", "customerName", "companyName"],
      });
    }

    return await DebtDeductionRequest.findByPk(requestId, {
      include: include.length > 0 ? include : undefined,
      lock: options?.lock,
      transaction: options?.transaction,
    });
  },

  getDebtDeductionByIds: async ({
    requestIds,
    options,
  }: {
    requestIds: number[];
    options?: {
      transaction?: Transaction;
      lock?: FindOptions["lock"];
      includeCustomer?: boolean;
    };
  }) => {
    const include: Includeable[] = [];
    if (options?.includeCustomer) {
      include.push({
        model: Customer,
        attributes: ["customerId", "customerName", "companyName"],
      });
    }

    return await DebtDeductionRequest.findAll({
      where: { requestId: { [Op.in]: requestIds } },
      include: include.length > 0 ? include : undefined,
      lock: options?.lock,
      transaction: options?.transaction,
    });
  },

  deleteById: (requestId: number, transaction?: Transaction) => {
    return DebtDeductionRequest.destroy({
      where: { requestId },
      transaction,
    });
  },
};
