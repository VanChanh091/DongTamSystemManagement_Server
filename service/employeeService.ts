import dotenv from "dotenv";
dotenv.config();

import { Op } from "sequelize";
import { Response } from "express";
import { CacheManager } from "../utils/helper/cache/cacheManager";
import { AppError } from "../utils/appError";
import { EmployeeBasicInfo } from "../models/employee/employeeBasicInfo";
import { employeeRepository } from "../repository/employeeRepository";
import { createDataTable, updateChildTable } from "../utils/helper/modelHelper/orderHelpers";
import { EmployeeCompanyInfo } from "../models/employee/employeeCompanyInfo";
import { exportExcelResponse } from "../utils/helper/excelExporter";
import { employeeColumns, mappingEmployeeRow } from "../utils/mapping/employeeRowAndColumn";
import { runInTransaction } from "../utils/helper/transactionHelper";
import redisCache from "../assets/configs/connect/redis.connect";
import { CacheKey } from "../utils/helper/cache/cacheKey";
import { meiliClient } from "../assets/configs/connect/meilisearch.connect";
import { meiliService } from "./meiliService";
import { searchFieldAtribute } from "../interface/types";
import { MEILI_INDEX } from "../assets/labelFields";

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

      let data, totalPages, totalEmployees;

      if (noPagingMode) {
        data = await employeeRepository.findAllEmployee();
        totalEmployees = data.length;
        totalPages = 1;
      } else {
        const { rows, count } = await employeeRepository.findEmployeeByPage({ page, pageSize });

        data = rows;
        totalEmployees = count;
        totalPages = Math.ceil(totalEmployees / pageSize);
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

  getEmployeesByField: async ({ field, keyword, page, pageSize }: searchFieldAtribute) => {
    try {
      const validFields = ["fullName", "phoneNumber", "employeeCode", "status"];
      if (!validFields.includes(field)) {
        throw AppError.BadRequest(`Field '${field}' is not supported for search`, "INVALID_FIELD");
      }

      const index = meiliClient.index("employees");

      const searchResult = await index.search(keyword, {
        attributesToSearchOn: [field],
        attributesToRetrieve: ["employeeId"],
        page: Number(page) || 1,
        hitsPerPage: Number(pageSize) || 25,
      });

      const employeeIds = searchResult.hits.map((hit: any) => hit.employeeId);
      if (employeeIds.length === 0) {
        return {
          message: "No employees found",
          data: [],
          totalEmployees: 0,
          totalPages: 1,
          currentPage: page,
        };
      }

      //query db
      const fullEmployees = await employeeRepository.getEmployeeByField({
        employeeId: { [Op.in]: employeeIds },
      });

      // Sắp xếp lại thứ tự của SQL theo đúng thứ tự của Meilisearch
      const finalData = employeeIds
        .map((id) => fullEmployees.find((employee) => employee.employeeId === id))
        .filter(Boolean);

      return {
        message: "Get employees from Meilisearch & DB successfully",
        data: finalData,
        totalEmployees: searchResult.totalHits,
        totalPages: searchResult.totalPages,
        currentPage: searchResult.page,
      };
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

        let nextNumber = 1;
        if (lastEmployee && lastEmployee.employeeCode) {
          const part = lastEmployee.employeeCode.split("-");
          const lastNumber = parseInt(part[1], 10) || 0;
          nextNumber = lastNumber + 1;
        }

        // Generate next employee code - format: PREFIX-XXX
        const prefix = companyInfo.employeeCode.toUpperCase();
        const nextCode = `${prefix}-${nextNumber.toString().padStart(3, "0")}`;

        const newBasicInfo = await employeeRepository.createEmployee(
          EmployeeBasicInfo,
          basicInfo,
          transaction,
        );

        const employeeId = newBasicInfo.employeeId;

        await createDataTable({
          model: EmployeeCompanyInfo,
          data: { ...companyInfo, employeeId: employeeId, employeeCode: nextCode },
          transaction,
        });

        //--------------------MEILISEARCH-----------------------
        await employeeService.syncEmployeeForMeili(employeeId, transaction);

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
        const result = await employeeRepository.findEmployeeByPk(employeeId, transaction);
        if (!result) {
          throw AppError.NotFound("Employee not found", "EMPLOYEE_NOT_FOUND");
        }

        //update basic info
        if (basicInfo) {
          await employeeRepository.updateEmployee(result, basicInfo, transaction);
        }

        //update company info if existed
        await updateChildTable({
          model: EmployeeCompanyInfo,
          where: { employeeId: result.employeeId },
          data: { employeeId: result.employeeId, ...companyInfo },
          transaction,
        });

        //--------------------MEILISEARCH-----------------------
        const updatedEmployee = await employeeRepository.findEmployeeForMeili(
          employeeId,
          transaction,
        );

        return { message: "Cập nhật nhân viên thành công", data: updatedEmployee };
      });
    } catch (error) {
      console.error("updated employees failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  syncEmployeeForMeili: async (employeeId: number, transaction: any) => {
    try {
      const employee = await employeeRepository.findEmployeeForMeili(employeeId, transaction);

      if (employee) {
        await meiliService.syncOrUpdateMeiliData({
          indexKey: MEILI_INDEX.EMPLOYEES,
          data: employee.toJSON(),
          transaction,
        });
      }
    } catch (error) {
      console.error("❌ sync employee failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  deleteEmployee: async (employeeId: number) => {
    try {
      return await runInTransaction(async (transaction) => {
        const employee = await employeeRepository.findEmployeeByPk(employeeId, transaction);
        if (!employee) {
          throw AppError.NotFound("Employee not found", "EMPLOYEE_NOT_FOUND");
        }

        // Xóa bản ghi chính
        await employee.destroy({ transaction });

        //--------------------MEILISEARCH-----------------------
        await meiliService.deleteMeiliData(MEILI_INDEX.EMPLOYEES, employeeId, transaction);

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
        whereCondition["$companyInfo.status$"] = status.toLowerCase().trim();
      } else if (joinDate) {
        const start = new Date(joinDate);
        start.setHours(0, 0, 0, 0);

        const end = new Date();
        end.setHours(23, 59, 59, 999);

        whereCondition["$companyInfo.joinDate$"] = { [Op.between]: [start, end] };
      }

      const { rows } = await employeeRepository.findEmployeeByPage({ whereCondition });

      await exportExcelResponse(res, {
        data: rows,
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
