import dotenv from "dotenv";
dotenv.config();

import { Op } from "sequelize";
import redisCache from "../assest/configs/redisCache";
import { Customer } from "../models/customer/customer";
import { customerRepository } from "../repository/customerRepository";
import { AppError } from "../utils/appError";
import { CacheManager } from "../utils/helper/cacheManager";
import { exportExcelResponse } from "../utils/helper/excelExporter";
import { filterDataFromCache } from "../utils/helper/modelHelper/orderHelpers";
import { customerColumns, mappingCustomerRow } from "../utils/mapping/customerRowAndColumn";
import { Response } from "express";
import { runInTransaction } from "../utils/helper/transactionHelper";
import { Order } from "../models/order/order";

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
          const parsed = JSON.parse(cachedData);
          return { ...parsed, message: `Get all customers from cache` };
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
        message: "Get all customers successfully",
        data,
        totalCustomers,
        totalPages,
        currentPage: noPagingMode ? 1 : page,
      };

      await redisCache.set(cacheKey, JSON.stringify(responseData), "EX", 3600);

      return responseData;
    } catch (error) {
      console.error("❌ get all customer failed:", error);
      throw AppError.ServerError();
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
        throw AppError.BadRequest("Invalid field parameter", "INVALID_FIELD");
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
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  createCustomer: async (data: any) => {
    const { prefix = "CUSTOM", ...customerData } = data;

    try {
      return await runInTransaction(async (transaction) => {
        const sanitizedPrefix = prefix.trim().replace(/\s+/g, "").toUpperCase();

        const existedCustomers = await customerRepository.findByIdOrMst(
          sanitizedPrefix,
          customerData.mst,
          transaction,
        );

        const prefixExists = existedCustomers.some((c) => c.customerId.startsWith(sanitizedPrefix));
        const mstExists =
          customerData.mst && customerData.mst.trim() !== ""
            ? existedCustomers.some((c) => c.mst === customerData.mst)
            : false;

        if (prefixExists) {
          throw AppError.Conflict(
            `Prefix '${sanitizedPrefix}' đã tồn tại, vui lòng chọn prefix khác`,
            "PREFIX_ALREADY_EXISTS",
          );
        }

        if (mstExists) {
          throw AppError.Conflict(`MST '${customerData.mst}' đã tồn tại`, "MST_ALREADY_EXISTS");
        }

        const maxSeq = (await Customer.max("customerSeq", { transaction })) ?? 0;

        //create next id
        const nextId = Number(maxSeq) + 1;
        const newCustomerId = `${prefix}${String(nextId).padStart(4, "0")}`;

        const newCustomer = await customerRepository.createCustomer(
          { customerId: newCustomerId, customerSeq: nextId, ...customerData },
          transaction,
        );

        return { message: "Customer created successfully", data: newCustomer };
      });
    } catch (error) {
      console.error("❌ Failed to create customer:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  updateCustomer: async (customerId: string, customerData: any) => {
    try {
      return await runInTransaction(async (transaction) => {
        const customer = await customerRepository.findByCustomerId(customerId, transaction);
        if (!customer) {
          throw AppError.NotFound("Customer not found", "CUSTOMER_NOT_FOUND");
        }

        const result = await customerRepository.updateCustomer(customer, customerData, transaction);

        return { message: "Customer updated successfully", data: result };
      });
    } catch (error) {
      console.error("❌ Update customer failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  deleteCustomer: async (customerId: string, role: string) => {
    try {
      return await runInTransaction(async (transaction) => {
        const customer = await Customer.findByPk(customerId, {
          attributes: ["customerId"],
          transaction,
        });
        if (!customer) {
          throw AppError.NotFound("Customer not found", "CUSTOMER_NOT_FOUND");
        }

        const orderCount = await Order.count({ where: { customerId }, transaction });

        if (orderCount > 0) {
          if (role != "admin") {
            throw AppError.Conflict(
              `CustomerId: ${customerId} has order and cannot be deleted`,
              "CUSTOMER_HAS_ORDERS",
            );
          }
        }

        await customerRepository.deleteCustomer(customerId, transaction);

        return { message: "Customer deleted successfully" };
      });
    } catch (error) {
      console.error("❌ Delete customer failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
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
      throw AppError.ServerError();
    }
  },
};
