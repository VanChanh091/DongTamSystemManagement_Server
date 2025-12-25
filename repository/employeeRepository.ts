import { col, fn, Op, Sequelize, where } from "sequelize";
import { EmployeeBasicInfo } from "../models/employee/employeeBasicInfo";
import { EmployeeCompanyInfo } from "../models/employee/employeeCompanyInfo";

export const employeeRepository = {
  employeeCount: async () => {
    return await EmployeeBasicInfo.count();
  },

  findEmployeeById: async (employeeId: number) => {
    return await EmployeeBasicInfo.findOne({
      where: { employeeId: employeeId },
      include: [{ model: EmployeeCompanyInfo, as: "companyInfo" }],
    });
  },

  findEmployeeByPk: async (employeeId: number, transaction?: any) => {
    return await EmployeeBasicInfo.findByPk(employeeId, {
      include: [{ model: EmployeeCompanyInfo, as: "companyInfo" }],
      transaction,
    });
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

  findEmployeeByPage: async (page: number, pageSize: number) => {
    return await EmployeeBasicInfo.findAll({
      attributes: { exclude: ["createdAt", "updatedAt"] },
      include: [
        {
          model: EmployeeCompanyInfo,
          as: "companyInfo",
          attributes: { exclude: ["createdAt", "updatedAt"] },
        },
      ],
      offset: (page - 1) * pageSize,
      limit: pageSize,
      order: [
        //lấy 3 số cuối -> ép chuỗi thành số để so sánh -> sort
        [Sequelize.literal("CAST(RIGHT(`companyInfo`.`employeeCode`, 3) AS UNSIGNED)"), "ASC"],
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
          where: where(fn("LOWER", col("companyInfo.position")), {
            [Op.like]: "%trưởng máy%",
          }),
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

  exportExcelEmpl: async (whereCondition: any = {}) => {
    return await EmployeeBasicInfo.findAll({
      attributes: { exclude: ["createdAt", "updatedAt"] },
      include: [
        {
          model: EmployeeCompanyInfo,
          where: whereCondition,
          as: "companyInfo",
          attributes: { exclude: ["createdAt", "updatedAt"] },
        },
      ],
    });
  },
};
