"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inventoryService = void 0;
const inventory_1 = require("../../models/warehouse/inventory");
const warehouseRepository_1 = require("../../repository/warehouseRepository");
const appError_1 = require("../../utils/appError");
exports.inventoryService = {
    getAllInventory: async (page, pageSize) => {
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
            const totalInventory = await warehouseRepository_1.warehouseRepository.inventoryCount();
            const totalPages = Math.ceil(totalInventory / pageSize);
            const data = await warehouseRepository_1.warehouseRepository.getInventoryByPage(page, pageSize);
            const responseData = {
                message: "Get all inventory successfully",
                data,
                totalInventory,
                totalPages,
                currentPage: page,
            };
            //   await redisCache.set(cacheKey, JSON.stringify(responseData), "EX", 3600);
            return responseData;
        }
        catch (error) {
            console.error("Failed to get paper waiting checked:", error);
            throw appError_1.AppError.ServerError();
        }
    },
    createNewInventory: async (orderId, transaction) => {
        try {
            if (!orderId) {
                throw appError_1.AppError.BadRequest("Missing orderId", "MISSING_ORDER_ID");
            }
            const existedInventory = await warehouseRepository_1.warehouseRepository.findByOrderId({ orderId, transaction });
            if (existedInventory) {
                return existedInventory;
            }
            return await inventory_1.Inventory.create({ orderId }, { transaction });
        }
        catch (error) {
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    exportExcelInventory: async () => {
        try {
        }
        catch (error) {
            console.error("Error create inventory:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
};
//# sourceMappingURL=inventoryService.js.map