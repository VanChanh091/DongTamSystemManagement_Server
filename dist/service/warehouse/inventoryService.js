"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.inventoryService = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const appError_1 = require("../../utils/appError");
const cacheKey_1 = require("../../utils/helper/cache/cacheKey");
const inventory_1 = require("../../models/warehouse/inventory");
const excelExporter_1 = require("../../utils/helper/excelExporter");
const warehouseRepository_1 = require("../../repository/warehouseRepository");
const inventoryRowAndColumn_1 = require("../../utils/mapping/inventoryRowAndColumn");
const redis_config_1 = __importDefault(require("../../assest/configs/connect/redis.config"));
const cacheManager_1 = require("../../utils/helper/cache/cacheManager");
const devEnvironment = process.env.NODE_ENV !== "production";
const { inventory } = cacheKey_1.CacheKey.warehouse;
exports.inventoryService = {
    getAllInventory: async ({ field, keyword, page, pageSize, }) => {
        const cacheKey = inventory.page(page);
        try {
            const { isChanged } = await cacheManager_1.CacheManager.check(inventory_1.Inventory, "inventory");
            if (isChanged) {
                await cacheManager_1.CacheManager.clear("inventory");
            }
            else {
                const cachedData = await redis_config_1.default.get(cacheKey);
                if (cachedData) {
                    if (devEnvironment)
                        console.log("✅ Data inventory from Redis");
                    return { ...JSON.parse(cachedData), message: `Get all inventory from cache` };
                }
            }
            const { count, rows } = await warehouseRepository_1.warehouseRepository.getInventoryByPage({
                field: field,
                keyword: keyword,
                page: page,
                pageSize: pageSize,
            });
            const totalPages = Math.ceil(count / pageSize);
            const totals = await warehouseRepository_1.warehouseRepository.inventoryTotals();
            const responseData = {
                message: "Get all inventory successfully",
                data: rows,
                totalInventory: count,
                totalPages,
                currentPage: page,
                totalValueInventory: totals?.totalValueInventory || 0,
            };
            await redis_config_1.default.set(cacheKey, JSON.stringify(responseData), "EX", 3600);
            return responseData;
        }
        catch (error) {
            console.error("Failed to get inventory:", error);
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
    exportExcelInventory: async (res) => {
        try {
            const { rows } = await warehouseRepository_1.warehouseRepository.getInventoryByPage({});
            await (0, excelExporter_1.exportExcelResponse)(res, {
                data: rows,
                sheetName: "Tồn Kho",
                fileName: "inventory",
                columns: inventoryRowAndColumn_1.inventoryColumns,
                rows: inventoryRowAndColumn_1.mappingInventoryRow,
            });
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