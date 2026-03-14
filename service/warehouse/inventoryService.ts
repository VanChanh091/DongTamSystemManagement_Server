import dotenv from "dotenv";
dotenv.config();

import { Inventory } from "../../models/warehouse/inventory";
import { warehouseRepository } from "../../repository/warehouseRepository";
import { AppError } from "../../utils/appError";
import { CacheKey } from "../../utils/helper/cache/cacheKey";
import { filterDataFromCache } from "../../utils/helper/modelHelper/orderHelpers";

const devEnvironment = process.env.NODE_ENV !== "production";
const { inventory } = CacheKey.warehouse;

export const inventoryService = {
  getAllInventory: async ({
    field,
    keyword,
    page,
    pageSize,
  }: {
    field?: string;
    keyword?: string;
    page: number;
    pageSize: number;
  }) => {
    // const cacheKey = inbound.page(page);

    try {
      //   const { isChanged } = await CacheManager.check(InboundHistory, "inbound");
      //   if (isChanged) {
      //     await CacheManager.clearInbound();
      //   } else {
      //     const cachedData = await redisCache.get(cacheKey);
      //     if (cachedData) {
      //       if (devEnvironment) console.log("✅ Data inbound from Redis");
      //       const parsed = JSON.parse(cachedData);
      //       return { ...parsed, message: `Get all inbound from cache` };
      //     }
      //   }

      const { count, rows } = await warehouseRepository.getInventoryByPage({
        field: field,
        keyword: keyword,
        page: page,
        pageSize: pageSize,
      });
      const totalPages = Math.ceil(count / pageSize);
      const totals: any = await warehouseRepository.inventoryTotals();

      const responseData = {
        message: "Get all inventory successfully",
        data: rows,
        totalInventory: count,
        totalPages,
        currentPage: page,
        totalValueInventory: totals?.totalValueInventory || 0,
      };

      //   await redisCache.set(cacheKey, JSON.stringify(responseData), "EX", 3600);

      return responseData;
    } catch (error) {
      console.error("Failed to get paper waiting checked:", error);
      throw AppError.ServerError();
    }
  },

  createNewInventory: async (orderId: string, transaction?: any) => {
    try {
      if (!orderId) {
        throw AppError.BadRequest("Missing orderId", "MISSING_ORDER_ID");
      }

      const existedInventory = await warehouseRepository.findByOrderId({ orderId, transaction });
      if (existedInventory) {
        return existedInventory;
      }

      return await Inventory.create({ orderId }, { transaction });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  exportExcelInventory: async () => {
    try {
    } catch (error) {
      console.error("Error create inventory:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },
};
