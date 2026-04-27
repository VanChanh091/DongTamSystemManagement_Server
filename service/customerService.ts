import redisCache from "../assets/configs/connect/redis.connect";
import dotenv from "dotenv";
dotenv.config();

import { Op } from "sequelize";
import { Response } from "express";
import { AppError } from "../utils/appError";
import { Order } from "../models/order/order";
import { Customer } from "../models/customer/customer";
import { CacheKey } from "../utils/helper/cache/cacheKey";
import { CacheManager } from "../utils/helper/cache/cacheManager";
import { exportExcelResponse } from "../utils/helper/excelExporter";
import { CustomerPayment } from "../models/customer/customerPayment";
import { runInTransaction } from "../utils/helper/transactionHelper";
import { customerRepository } from "../repository/customerRepository";
import { meiliClient } from "../assets/configs/connect/meilisearch.connect";
import { customerColumns, mappingCustomerRow } from "../utils/mapping/customerRowAndColumn";
import { createDataTable, updateChildTable } from "../utils/helper/modelHelper/orderHelpers";
import { meiliService } from "./meiliService";
import { searchFieldAtribute } from "../interface/types";
import { MEILI_INDEX } from "../assets/labelFields";
import { meiliTransformer } from "../assets/configs/meilisearch/meiliTransformer";

const devEnvironment = process.env.NODE_ENV !== "production";
const { customer } = CacheKey;

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
        await CacheManager.clear("customer");
      } else {
        const cachedData = await redisCache.get(cacheKey);
        if (cachedData) {
          if (devEnvironment) console.log("✅ Data Customer from Redis");
          return { ...JSON.parse(cachedData), message: `Get all customers from cache` };
        }
      }

      let data, totalPages, totalCustomers;
      if (noPagingMode) {
        data = await customerRepository.findAllCustomer();
        totalCustomers = data.length;
        totalPages = 1;
      } else {
        const { rows, count } = await customerRepository.findCustomerByPage({ page, pageSize });

        data = rows;
        totalCustomers = count;
        totalPages = Math.ceil(totalCustomers / pageSize);
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

  getCustomerByFields: async ({ field, keyword, page, pageSize }: searchFieldAtribute) => {
    try {
      const validFields = ["customerId", "customerName", "cskh", "phone", "dayCreated"];
      if (!validFields.includes(field)) {
        throw AppError.BadRequest(`Field '${field}' is not supported for search`, "INVALID_FIELD");
      }

      // console.log(`input keyword: ${keyword}`);

      if (field === "dayCreated") {
        const date = new Date(keyword);
        // console.log(`date: ${date}`);

        if (!isNaN(date.getTime())) {
          keyword = Math.floor(date.setUTCHours(0, 0, 0, 0) / 1000).toString();

          // console.log(`output keyword: ${keyword}`);
        }
      }

      const index = meiliClient.index("customers");

      const searchResult = await index.search(keyword, {
        attributesToSearchOn: [field],
        attributesToRetrieve: ["customerId"],
        page: Number(page) || 1,
        hitsPerPage: Number(pageSize) || 25, //pageSize
      });

      const customerIds = searchResult.hits.map((hit: any) => hit.customerId);
      if (customerIds.length === 0) {
        return {
          message: "No customers found",
          data: [],
          totalCustomers: 0,
          totalPages: 0,
          currentPage: page,
        };
      }

      //query db
      const { rows } = await customerRepository.findCustomerByPage({
        whereCondition: { customerId: { [Op.in]: customerIds } },
      });

      // Sắp xếp lại thứ tự của SQL theo đúng thứ tự của Meilisearch
      const finalData = customerIds
        .map((id) => rows.find((customer) => customer.customerId === id))
        .filter(Boolean);

      return {
        message: "Get customers from Meilisearch & DB successfully",
        data: finalData,
        totalCustomers: searchResult.totalHits,
        totalPages: searchResult.totalPages,
        currentPage: searchResult.page,
      };
    } catch (error) {
      console.error(`Failed to get customers by ${field}`, error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  createCustomer: async (data: any) => {
    const { prefix = "CUSTOM", payment, ...customerData } = data;

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

        //create customer payment
        await createDataTable({
          model: CustomerPayment,
          data: { customerId: newCustomerId, ...payment },
          transaction,
        });

        //--------------------MEILISEARCH-----------------------
        await customerService.syncCustomerForMeili(newCustomerId, transaction);

        return { message: "Customer created successfully", data: newCustomer };
      });
    } catch (error) {
      console.error("❌ Failed to create customer:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  updateCustomer: async (customerId: string, customerData: any) => {
    const { payment, ...restCustomerData } = customerData;

    try {
      return await runInTransaction(async (transaction) => {
        const customer = await customerRepository.findCustomerByPk({
          customerId,
          options: { transaction },
        });
        if (!customer) {
          throw AppError.NotFound("Customer not found", "CUSTOMER_NOT_FOUND");
        }

        await customerRepository.updateCustomer(customer, restCustomerData, transaction);

        await updateChildTable({
          model: CustomerPayment,
          where: { customerId },
          data: { customerId, ...payment },
          transaction,
        });

        //--------------------MEILISEARCH-----------------------
        const customerUpdated = await customerService.syncCustomerForMeili(customerId, transaction);

        return { message: "Customer updated successfully", data: customerUpdated };
      });
    } catch (error) {
      console.error("❌ Update customer failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  syncCustomerForMeili: async (customerId: string, transaction: any) => {
    try {
      const customer = await customerRepository.findCustomerForMeili(customerId, transaction);

      if (customer) {
        const flattenData = meiliTransformer.customer(customer);
        await meiliService.syncOrUpdateMeiliData({
          indexKey: MEILI_INDEX.CUSTOMERS,
          data: flattenData,
          transaction,
        });
      }
    } catch (error) {
      console.error("❌ sync customer failed:", error);
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

        await customer.destroy({ transaction });

        //--------------------MEILISEARCH-----------------------
        await meiliService.deleteMeiliData(MEILI_INDEX.CUSTOMERS, customerId, transaction);

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

      const { rows } = await customerRepository.findCustomerByPage({ whereCondition });

      await exportExcelResponse(res, {
        data: rows,
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
