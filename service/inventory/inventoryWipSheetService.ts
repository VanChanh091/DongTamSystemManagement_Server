import dotenv from "dotenv";
import { AppError } from "../../utils/appError";
import { InventoryWipSheets } from "../../models/warehouse/inventory/inventory_wip_sheets";
import { inventoryRepository } from "../../repository/inventoryRepository";
import redisCache from "../../assets/configs/connect/redis.connect";
import { CacheKey } from "../../utils/helper/cache/cacheKey";
import { CacheManager } from "../../utils/helper/cache/cacheManager";
dotenv.config();

const devEnvironment = process.env.NODE_ENV !== "production";
const { inventory_wip } = CacheKey.warehouse;

export const inventoryWipSheetService = {
  getAllInventoryWipSheets: async ({ page, pageSize }: { page: number; pageSize: number }) => {
    const cacheKey = inventory_wip.page(page);

    try {
      //   const { isChanged } = await CacheManager.check(inventoryWipSheetService, "inventory_wip");

      //   if (isChanged) {
      //     await CacheManager.clear("inventory_wip");
      //   } else {
      //     const cachedData = await redisCache.get(cacheKey);
      //     if (cachedData) {
      //       if (devEnvironment) console.log("✅ Data Inventory Wip from Redis");
      //       const parsed = JSON.parse(cachedData);
      //       return { ...parsed, message: `Get all inventory wip sheets from cache` };
      //     }
      //   }

      const options = inventoryRepository.buildWipSheetOptions({ page, pageSize });
      const { rows, count } = await InventoryWipSheets.findAndCountAll(options);

      const responseData = {
        message: "Get all inventory wip sheets successfully",
        data: rows,
        totalInbounds: count,
        totalPages: Math.ceil(count / pageSize),
        currentPage: page,
      };

      await redisCache.set(cacheKey, JSON.stringify(responseData), "EX", 3600);

      return responseData;
    } catch (error) {
      console.error("get all inventory wip sheets failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  getInvWipSheetByFields: async ({
    page,
    pageSize,
    field,
    keyword,
    startDate,
    endDate,
  }: {
    page: number;
    pageSize: number;
    field: string;
    keyword: string;
    startDate?: string;
    endDate?: string;
  }) => {
    try {
    } catch (error) {
      console.error("get inventory wip sheet by fields failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  exportInventoryWipSheets: async () => {
    try {
    } catch (error) {
      console.error("export inventory wip sheets failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },
};
