import { col, FindOptions, fn, Op, Transaction, where } from "sequelize";
import { EmployeeBasicInfo } from "../models/employee/employeeBasicInfo";
import { EmployeeCompanyInfo } from "../models/employee/employeeCompanyInfo";

export const employeeRepository = {
  buildEmployeeOptions: ({
    page,
    pageSize,
    whereCondition = {},
    isExport = false,
  }: {
    page?: number;
    pageSize?: number;
    whereCondition?: any;
    isExport?: boolean;
  }): FindOptions => {
    const queryOptions: FindOptions = {
      where: whereCondition,
      attributes: { exclude: ["createdAt", "updatedAt"] },
      include: [
        {
          model: EmployeeCompanyInfo,
          as: "companyInfo",
          attributes: { exclude: ["createdAt", "updatedAt"] },
        },
      ],
    };

    if (page && pageSize) {
      queryOptions.offset = (page - 1) * pageSize;
      queryOptions.limit = pageSize;
      queryOptions.order = [["employeeId", "ASC"]];
    }

    if (isExport) {
      queryOptions.raw = true;
      queryOptions.nest = true;
    }

    return queryOptions;
  },

  findEmployeeByPK: async (employeeId: number, transaction: Transaction) => {
    return await EmployeeBasicInfo.findByPk(employeeId, {
      attributes: { exclude: ["createdAt", "updatedAt"] },
      include: [
        {
          model: EmployeeCompanyInfo,
          as: "companyInfo",
          attributes: { exclude: ["createdAt", "updatedAt"] },
        },
      ],
      transaction,
    });
  },

  findEmployeeByPk: async (employeeId: number, transaction: Transaction) => {
    return await EmployeeBasicInfo.findByPk(employeeId, { transaction });
  },

  findAllEmployee: async () => {
    return await EmployeeBasicInfo.findAll({
      attributes: { exclude: ["createdAt", "updatedAt"] },
      include: [
        {
          model: EmployeeCompanyInfo,
          as: "companyInfo",
          attributes: { exclude: ["createdAt", "updatedAt"] },
        },
      ],
    });
  },

  findEmployeeByPosition: async () => {
    return await EmployeeBasicInfo.findAll({
      attributes: ["employeeId", "fullName"],
      include: [
        {
          model: EmployeeCompanyInfo,
          as: "companyInfo",
          attributes: ["position", "department"],
          where: {
            [Op.and]: [
              where(fn("LOWER", col("companyInfo.position")), {
                [Op.like]: "%trưởng máy%",
              }),
              { status: "Đang làm việc" },
            ],
          },
        },
      ],
    });
  },

  createEmployee: async (model: any, data: any, transaction?: Transaction) => {
    return await model.create(data, { transaction });
  },

  updateEmployee: async (employee: any, data: any, transaction?: Transaction) => {
    return await employee.update(data, { transaction });
  },

  deleteEmployee: async (employee: any, transaction?: Transaction) => {
    return await employee.destroy(transaction);
  },

  //------------------------MEILISEARCH-----------------------------
  buildMeiliEmployeeOptions: ({
    whereCondition,
    transaction,
  }: {
    whereCondition?: any;
    transaction?: Transaction;
  }): FindOptions => {
    const queryOptions: FindOptions = {
      where: whereCondition,
      attributes: ["employeeId", "fullName", "phoneNumber"],
      include: [
        {
          model: EmployeeCompanyInfo,
          as: "companyInfo",
          attributes: ["employeeCode", "status"],
        },
      ],
      order: [["employeeId", "ASC"]],
      transaction,
    };

    return queryOptions;
  },

  syncEmployeeForMeili: async (employeeId: number, transaction: Transaction) => {
    return await EmployeeBasicInfo.findOne(
      employeeRepository.buildMeiliEmployeeOptions({ whereCondition: { employeeId }, transaction }),
    );
  },

  syncAllEmployeesForMeili: async () => {
    return await EmployeeBasicInfo.findAll(employeeRepository.buildMeiliEmployeeOptions({}));
  },
};
