import { col, fn, Op, Transaction, where } from "sequelize";
import { EmployeeBasicInfo } from "../models/employee/employeeBasicInfo";
import { EmployeeCompanyInfo } from "../models/employee/employeeCompanyInfo";

export const employeeRepository = {
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

  findEmployeeByPage: async ({
    page,
    pageSize,
    whereCondition = {},
  }: {
    page?: number;
    pageSize?: number;
    whereCondition?: any;
  }) => {
    const query: any = {
      attributes: { exclude: ["createdAt", "updatedAt"] },
      include: [
        {
          model: EmployeeCompanyInfo,
          where: whereCondition,
          as: "companyInfo",
          attributes: { exclude: ["createdAt", "updatedAt"] },
        },
      ],
      order: [["employeeId", "ASC"]],
    };

    if (page && pageSize) {
      query.offset = (page - 1) * pageSize;
      query.limit = pageSize;
    }

    return await EmployeeBasicInfo.findAndCountAll(query);
  },

  getEmployeeByField: async (whereCondition: any) => {
    return await EmployeeBasicInfo.findAll({
      where: whereCondition,
      attributes: { exclude: ["createdAt", "updatedAt"] },
      include: [
        {
          model: EmployeeCompanyInfo,
          as: "companyInfo",
          attributes: { exclude: ["createdAt", "updatedAt"] },
        },
      ],
      order: [["employeeId", "ASC"]],
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

  createEmployee: async (model: any, data: any, transaction?: any) => {
    return await model.create(data, { transaction });
  },

  updateEmployee: async (employee: any, data: any, transaction?: any) => {
    return await employee.update(data, { transaction });
  },

  deleteEmployee: async (employee: any, transaction?: any) => {
    return await employee.destroy(transaction);
  },

  //find customer for meilisearch
  findEmployeeForMeili: async (employeeId: number, transaction: Transaction) => {
    return await EmployeeBasicInfo.findByPk(employeeId, {
      attributes: ["employeeId", "fullName", "phoneNumber"],
      include: [
        {
          model: EmployeeCompanyInfo,
          as: "companyInfo",
          attributes: ["employeeCode", "status"],
        },
      ],
      transaction,
    });
  },
};
