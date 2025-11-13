import { Op } from "sequelize";
import redisCache from "../configs/redisCache";
import { Customer } from "../models/customer/customer";
import { customerRepository } from "../repository/customerRepository";
import { AppError } from "../utils/appError";
import { CacheManager } from "../utils/helper/cacheManager";
import { exportExcelResponse } from "../utils/helper/excelExporter";
import { generateNextId } from "../utils/helper/generateNextId";
import { filterDataFromCache } from "../utils/helper/modelHelper/orderHelpers";
import { customerColumns, mappingCustomerRow } from "../utils/mapping/customerRowAndColumn";
import { Response } from "express";
import dotenv from "dotenv";
dotenv.config();

const devEnvironment = process.env.NODE_ENV !== "production";
const { customer } = CacheManager.keys;

export const customerService = {
  getAllCustomers: async ({
    page = 1,
    pageSize = 20,
    noPaging = false,
  }: {
    page?: number;
    pageSize?: number;
    noPaging?: string | boolean;
  }) => {
    const noPagingMode = noPaging === "true";
    const cacheKey = noPaging === "true" ? customer.all : customer.page(page);

    try {
      const { isChanged } = await CacheManager.check(Customer, "customer");

      if (isChanged) {
        await CacheManager.clearCustomer();
      } else {
        const cachedData = await redisCache.get(cacheKey);
        if (cachedData) {
          if (devEnvironment) console.log("✅ Data Customer from Redis");
          return { ...JSON.parse(cachedData), fromCache: true };
        }
      }

      let data, totalPages;
      const totalCustomers = await customerRepository.customerCount();

      if (noPagingMode) {
        totalPages = 1;
        data = await customerRepository.findAllCustomer();
      } else {
        totalPages = Math.ceil(totalCustomers / pageSize);
        data = await customerRepository.findCustomerByPage(page, pageSize);
      }

      const responseData = {
        message: "",
        data,
        totalCustomers,
        totalPages,
        currentPage: noPagingMode ? 1 : page,
      };

      await redisCache.set(cacheKey, JSON.stringify(responseData), "EX", 3600);

      return responseData;
    } catch (error) {
      console.error("❌ get all customer failed:", error);
      throw new AppError("get all customer failed", 500);
    }
  },

  getCustomerByFields: async ({
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
        customerId: (customer: Customer) => customer.customerId,
        customerName: (customer: Customer) => customer.customerName,
        cskh: (customer: Customer) => customer.cskh,
        phone: (customer: Customer) => customer.phone,
      } as const;

      const key = field as keyof typeof fieldMap;

      if (!key || !fieldMap[key]) {
        throw new AppError("Invalid field parameter", 400);
      }

      const result = await filterDataFromCache({
        model: Customer,
        cacheKey: customer.search,
        keyword: keyword,
        getFieldValue: fieldMap[key],
        page,
        pageSize,
        message: `get all by ${field} from filtered cache`,
      });

      return result;
    } catch (error) {
      console.error(`Failed to get customers by ${field}`, error);
      throw new AppError(`Failed to get customers by ${field}`, 500);
    }
  },

  createCustomer: async (data: any) => {
    const { prefix = "CUSTOM", ...customerData } = data;
    const transaction = await Customer.sequelize?.transaction();

    try {
      const customers = await customerRepository.findAllIds(transaction);

      const allCustomerIds = customers.map((c) => c.customerId);
      const sanitizedPrefix = prefix.trim().replace(/\s+/g, "").toUpperCase();
      const newCustomerId = generateNextId(allCustomerIds, sanitizedPrefix, 4);

      const newCustomer = await customerRepository.createCustomer(
        { customerId: newCustomerId, ...customerData },
        transaction
      );

      await transaction?.commit();

      return { message: "Customer created successfully", data: newCustomer };
    } catch (error) {
      await transaction?.rollback();
      console.error("❌ Failed to create customer:", error);
      throw new AppError("Failed to create customer", 500);
    }
  },

  updateCustomer: async (customerId: string, customerData: any) => {
    const transaction = await Customer.sequelize?.transaction();

    try {
      const customer = await customerRepository.findByCustomerId(customerId, transaction);
      if (!customer) {
        throw new AppError("Customer not found", 404);
      }

      const result = await customerRepository.updateCustomer(customer, customerData, transaction);

      await transaction?.commit();

      return { message: "Customer updated successfully", data: result };
    } catch (error) {
      await transaction?.rollback();
      console.error("❌ Update customer failed:", error);
      throw new AppError("Update customer failed", 500);
    }
  },

  deleteCustomer: async (customerId: string) => {
    const transaction = await Customer.sequelize?.transaction();

    try {
      const deletedCustomer = await customerRepository.deleteCustomer(customerId, transaction);

      if (!deletedCustomer) {
        await transaction?.rollback();
        throw new AppError("Customer not found", 404);
      }

      await transaction?.commit();

      return { message: "Customer deleted successfully" };
    } catch (error) {
      await transaction?.rollback();
      console.error("❌ Delete customer failed:", error);
      throw new AppError("Delete customer failed", 500);
    }
  },

  exportExcelCustomer: async (res: Response, { fromDate, toDate, all = false }: any) => {
    try {
      let whereCondition: any = {};

      if (all === "true") {
        // xuất toàn bộ -> để whereCondition = {}
      } else if (fromDate && toDate) {
        const start = new Date(fromDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);

        whereCondition.timePayment = { [Op.between]: [start, end] };
      }

      const data = await customerRepository.findAllForExport(whereCondition);

      await exportExcelResponse(res, {
        data: data,
        sheetName: "Danh sách khách hàng",
        fileName: "customer",
        columns: customerColumns,
        rows: mappingCustomerRow,
      });
    } catch (error) {
      console.error("❌ Export Excel error:", error);
      throw new AppError("Export Excel error", 500);
    }
  },
};
