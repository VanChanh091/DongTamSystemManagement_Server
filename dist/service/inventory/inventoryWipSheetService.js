"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.inventoryWipSheetService = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const appError_1 = require("../../utils/appError");
const inventory_wip_sheets_1 = require("../../models/warehouse/inventory/inventory_wip_sheets");
const inventoryRepository_1 = require("../../repository/inventoryRepository");
const redis_connect_1 = __importDefault(require("../../assets/configs/connect/redis.connect"));
const cacheKey_1 = require("../../utils/helper/cache/cacheKey");
dotenv_1.default.config();
const devEnvironment = process.env.NODE_ENV !== "production";
const { inventory_wip } = cacheKey_1.CacheKey.warehouse;
exports.inventoryWipSheetService = {
    getAllInventoryWipSheets: async ({ page, pageSize }) => {
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
            const options = inventoryRepository_1.inventoryRepository.buildWipSheetOptions({ page, pageSize });
            const { rows, count } = await inventory_wip_sheets_1.InventoryWipSheets.findAndCountAll(options);
            const responseData = {
                message: "Get all inventory wip sheets successfully",
                data: rows,
                totalInbounds: count,
                totalPages: Math.ceil(count / pageSize),
                currentPage: page,
            };
            await redis_connect_1.default.set(cacheKey, JSON.stringify(responseData), "EX", 3600);
            return responseData;
        }
        catch (error) {
            console.error("get all inventory wip sheets failed:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    getInvWipSheetByFields: async ({ page, pageSize, field, keyword, startDate, endDate, }) => {
        try {
        }
        catch (error) {
            console.error("get inventory wip sheet by fields failed:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    exportInventoryWipSheets: async () => {
        try {
        }
        catch (error) {
            console.error("export inventory wip sheets failed:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
};
//# sourceMappingURL=inventoryWipSheetService.js.map