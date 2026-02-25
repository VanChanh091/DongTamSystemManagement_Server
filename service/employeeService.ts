import dotenv from "dotenv";
dotenv.config();

import { Op } from "sequelize";
import { Response } from "express";
import { CacheManager } from "../utils/helper/cache/cacheManager";
import { AppError } from "../utils/appError";
import { EmployeeBasicInfo } from "../models/employee/employeeBasicInfo";
import { employeeRepository } from "../repository/employeeRepository";
import { filterDataFromCache } from "../utils/helper/modelHelper/orderHelpers";
import { EmployeeCompanyInfo } from "../models/employee/employeeCompanyInfo";
import { exportExcelResponse } from "../utils/helper/excelExporter";
import { employeeColumns, mappingEmployeeRow } from "../utils/mapping/employeeRowAndColumn";
import { runInTransaction } from "../utils/helper/transactionHelper";
import redisCache from "../assest/configs/redisCache";
import { CacheKey } from "../utils/helper/cache/cacheKey";

const devEnvironment = process.env.NODE_ENV !== "production";
const { employee } = CacheKey;

export const employeeService = {
  getAllEmployees: async ({
    page = 1,
    pageSize = 20,
    noPaging = false,
  }: {
    page?: number;
    pageSize?: number;
    noPaging?: string | boolean;
  }) => {
    const noPagingMode = noPaging === "true";
    const cacheKey = noPaging === "true" ? employee.all : employee.page(page);

    try {
      const { isChanged } = await CacheManager.check(
        [{ model: EmployeeBasicInfo }, { model: EmployeeCompanyInfo }],
        "employee",
      );

      if (isChanged) {
        await CacheManager.clear("employee");
      } else {
        const cachedData = await redisCache.get(cacheKey);
        if (cachedData) {
          if (devEnvironment) console.log("✅ Data Employees from Redis");
          const parsed = JSON.parse(cachedData);
          return { ...parsed, message: `Get all employees from cache` };
        }
      }

      let data, totalPages;
      const totalEmployees = await employeeRepository.employeeCount();

      if (noPagingMode) {
        totalPages = 1;
        data = await employeeRepository.findAllEmployee();
      } else {
        totalPages = Math.ceil(totalEmployees / pageSize);
        data = await employeeRepository.findEmployeeByPage(page, pageSize);
      }

      const responseData = {
        message: "Get all employees successfully",
        data,
        totalEmployees,
        totalPages,
        currentPage: page,
      };

      await redisCache.set(cacheKey, JSON.stringify(responseData), "EX", 3600);

      return responseData;
    } catch (error) {
      console.error("get all employees failed:", error);
      throw AppError.ServerError();
    }
  },

  getEmployeesByField: async ({
    field,
    keyword,
    page,
    pageSize,
  }: {
    field: string;
    keyword: string;
    page: number;
    pageSize: number;
  }) => {
    try {
      const fieldMap = {
        employeeId: (employee: EmployeeBasicInfo) => employee.employeeId,
        fullName: (employee: EmployeeBasicInfo) => employee.fullName,
        phoneNumber: (employee: EmployeeBasicInfo) => employee.phoneNumber,
        employeeCode: (employee: EmployeeBasicInfo) => employee.companyInfo?.employeeCode,
        status: (employee: EmployeeBasicInfo) => employee.companyInfo.status,
      } as const;

      const key = field as keyof typeof fieldMap;
      if (!fieldMap[key]) {
        throw AppError.BadRequest("Invalid field parameter", "INVALID_FIELD");
      }

      const result = await filterDataFromCache({
        model: EmployeeBasicInfo,
        cacheKey: employee.search,
        keyword: keyword,
        getFieldValue: fieldMap[key],
        page,
        pageSize,
        message: `get all by ${field} from filtered cache`,
        fetchFunction: async () => {
          return await employeeRepository.findAllEmployee();
        },
      });

      return result;
    } catch (error) {
      console.error(`Failed to get employees by ${field}:`, error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  //this func use to get list shift management for report manufacture
  getEmployeeByPosition: async () => {
    try {
      const data = await employeeRepository.findEmployeeByPosition();

      return { message: "Get all employee by position sucessfully", data };
    } catch (error) {
      console.error(`Failed to get employees by position`, error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  createEmployee: async (data: any) => {
    const { companyInfo, ...basicInfo } = data;

    try {
      return await runInTransaction(async (transaction) => {
        const lastEmployee = await EmployeeCompanyInfo.findOne({
          attributes: ["employeeCode"],
          order: [["companyInfoId", "DESC"]],
          lock: transaction.LOCK.UPDATE,
          transaction,
        });

        console.log(lastEmployee?.toJSON());

        let nextNumber = 1;
        if (lastEmployee && lastEmployee.employeeCode) {
          const part = lastEmployee.employeeCode.split("-");
          const lastNumber = parseInt(part[1], 10) || 0;
          nextNumber = lastNumber + 1;
        }

        // Generate next employee code - format: PREFIX-XXX
        const prefix = companyInfo.employeeCode.toUpperCase();
        const nextCode = `${prefix}-${nextNumber.toString().padStart(3, "0")}`;

        console.log(nextCode);

        const newBasicInfo = await employeeRepository.createEmployee(
          EmployeeBasicInfo,
          basicInfo,
          transaction,
        );

        await employeeRepository.createEmployee(
          EmployeeCompanyInfo,
          { ...companyInfo, employeeId: newBasicInfo.employeeId, employeeCode: nextCode },
          transaction,
        );

        return { message: "create new employee successfully" };
      });
    } catch (error) {
      console.error("create employee failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  updateEmployee: async (employeeId: number, data: any) => {
    const { companyInfo, ...basicInfo } = data;
    try {
      return await runInTransaction(async (transaction) => {
        const employee = await employeeRepository.findEmployeeByPk(employeeId, transaction);
        if (!employee) {
          throw AppError.NotFound("Employee not found", "EMPLOYEE_NOT_FOUND");
        }

        if (basicInfo) {
          await employeeRepository.updateEmployee(employee, basicInfo, transaction);
        }

        if (companyInfo && employee.companyInfo) {
          await employeeRepository.updateEmployee(employee.companyInfo, companyInfo, transaction);
        } else if (companyInfo) {
          await employeeRepository.createEmployee(
            EmployeeCompanyInfo,
            { employeeId: employee.employeeId, ...companyInfo },
            transaction,
          );
        }

        const updatedEmployee = await employeeRepository.findEmployeeById(employeeId);

        return { message: "Cập nhật nhân viên thành công", data: updatedEmployee };
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  deleteEmployee: async (employeeId: number) => {
    try {
      return await runInTransaction(async (transaction) => {
        const employee = await employeeRepository.findEmployeeByPk(employeeId);
        if (!employee) {
          throw AppError.NotFound("Employee not found", "EMPLOYEE_NOT_FOUND");
        }

        // Xóa bản ghi chính
        await employee.destroy({ transaction });

        return { message: "delete employee successfully" };
      });
    } catch (error) {
      console.error("delete employees failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  exportExcelEmployee: async (res: Response, { status, joinDate, all = false }: any) => {
    try {
      let whereCondition: any = {};
      if (all === "true") {
        // no filtering; fetch all employees
      } else if (status) {
        const normalizedStatus = status.toLowerCase().trim();
        whereCondition["$companyInfo.status$"] = normalizedStatus;
      } else if (joinDate) {
        const start = new Date(joinDate);
        start.setHours(0, 0, 0, 0);

        const end = new Date();
        end.setHours(23, 59, 59, 999);

        whereCondition["$companyInfo.joinDate$"] = { [Op.between]: [start, end] };
      }

      const data = await employeeRepository.findAllEmployee();

      await exportExcelResponse(res, {
        data: data,
        sheetName: "Danh sách nhân viên",
        fileName: "employee",
        columns: employeeColumns,
        rows: mappingEmployeeRow,
      });
    } catch (error) {
      console.error("export excel employee failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },
};
