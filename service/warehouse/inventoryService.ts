import { Inventory } from "../../models/warehouse/inventory";
import { warehouseRepository } from "../../repository/warehouseRepository";
import { AppError } from "../../utils/appError";

export const inventoryService = {
  getAllInventory: async (page: number, pageSize: number) => {
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

      const totalInventory = await warehouseRepository.inventoryCount();
      const totalPages = Math.ceil(totalInventory / pageSize);
      const data = await warehouseRepository.getInventoryByPage(page, pageSize);

      const responseData = {
        message: "Get all inventory successfully",
        data,
        totalInventory,
        totalPages,
        currentPage: page,
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
