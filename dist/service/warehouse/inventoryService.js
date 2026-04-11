"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.inventoryService = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const sequelize_1 = require("sequelize");
const appError_1 = require("../../utils/appError");
const cacheKey_1 = require("../../utils/helper/cache/cacheKey");
const inventory_1 = require("../../models/warehouse/inventory");
const redis_connect_1 = __importDefault(require("../../assest/configs/connect/redis.connect"));
const cacheManager_1 = require("../../utils/helper/cache/cacheManager");
const excelExporter_1 = require("../../utils/helper/excelExporter");
const warehouseRepository_1 = require("../../repository/warehouseRepository");
const meilisearch_connect_1 = require("../../assest/configs/connect/meilisearch.connect");
const inventoryRowAndColumn_1 = require("../../utils/mapping/inventoryRowAndColumn");
const devEnvironment = process.env.NODE_ENV !== "production";
const { inventory } = cacheKey_1.CacheKey.warehouse;
exports.inventoryService = {
    getAllInventory: async (page, pageSize) => {
        const cacheKey = inventory.page(page);
        try {
            const { isChanged } = await cacheManager_1.CacheManager.check(inventory_1.Inventory, "inventory");
            if (isChanged) {
                await cacheManager_1.CacheManager.clear("inventory");
            }
            else {
                const cachedData = await redis_connect_1.default.get(cacheKey);
                if (cachedData) {
                    if (devEnvironment)
                        console.log("✅ Data inventory from Redis");
                    return { ...JSON.parse(cachedData), message: `Get all inventory from cache` };
                }
            }
            const { rows, count } = await warehouseRepository_1.warehouseRepository.getInventoryByPage({ page, pageSize });
            const totals = await warehouseRepository_1.warehouseRepository.inventoryTotals();
            const responseData = {
                message: "Get all inventory successfully",
                data: rows,
                totalInventory: count,
                totalPages: Math.ceil(count / pageSize),
                currentPage: page,
                totalValueInventory: totals?.totalValueInventory || 0,
            };
            await redis_connect_1.default.set(cacheKey, JSON.stringify(responseData), "EX", 3600);
            return responseData;
        }
        catch (error) {
            console.error("Failed to get inventory:", error);
            throw appError_1.AppError.ServerError();
        }
    },
    getInventoryByField: async ({ field, keyword, page, pageSize }) => {
        try {
            const validFields = ["orderId", "customerName"];
            if (!validFields.includes(field)) {
                throw appError_1.AppError.BadRequest(`Field '${field}' is not supported for search`, "INVALID_FIELD");
            }
            const index = meilisearch_connect_1.meiliClient.index("inventories");
            const searchResult = await index.search(keyword, {
                attributesToSearchOn: [field],
                attributesToRetrieve: ["inventoryId"],
                page: Number(page) || 1,
                hitsPerPage: Number(pageSize) || 25, //pageSize
            });
            const inventoryIds = searchResult.hits.map((hit) => hit.inventoryId);
            if (inventoryIds.length === 0) {
                return {
                    message: "No inventories found",
                    data: [],
                    totalInventory: 0,
                    totalPages: 0,
                    currentPage: page,
                };
            }
            //query db
            const { rows } = await warehouseRepository_1.warehouseRepository.getInventoryByPage({
                searching: { inventoryId: { [sequelize_1.Op.in]: inventoryIds } },
            });
            // Sắp xếp lại thứ tự của SQL theo đúng thứ tự của Meilisearch
            const finalData = inventoryIds
                .map((id) => rows.find((inventory) => inventory.inventoryId === id))
                .filter(Boolean);
            return {
                message: "Get customers from Meilisearch & DB successfully",
                data: finalData,
                totalInventory: searchResult.totalHits,
                totalPages: searchResult.totalPages,
                currentPage: searchResult.page,
            };
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