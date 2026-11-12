"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.invWipSheetService = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const appError_1 = require("../../utils/appError");
const inventory_wip_sheets_1 = require("../../models/warehouse/inventory/inventory_wip_sheets");
const inventoryRepository_1 = require("../../repository/inventoryRepository");
const redis_connect_1 = __importDefault(require("../../assets/configs/connect/redis.connect"));
const cacheKey_1 = require("../../utils/helper/cache/cacheKey");
const cacheManager_1 = require("../../utils/helper/cache/cacheManager");
const meilisearch_connect_1 = require("../../assets/configs/connect/meilisearch.connect");
const sequelize_1 = require("sequelize");
const dayjs_config_1 = require("../../assets/configs/dayjs/dayjs.config");
const excelExporter_1 = require("../../utils/helper/excelExporter");
const invWipSheetsRowAndColumn_1 = require("../../utils/mapping/warehouse/invWipSheetsRowAndColumn");
dotenv_1.default.config();
const devEnvironment = process.env.NODE_ENV !== "production";
const { inventory_wip } = cacheKey_1.CacheKey.warehouse;
exports.invWipSheetService = {
    getAllInventoryWipSheets: async ({ page, pageSize }) => {
        const cacheKey = inventory_wip.page(page);
        try {
            const { isChanged } = await cacheManager_1.CacheManager.check(inventory_wip_sheets_1.InventoryWipSheets, "inventory_wip");
            if (isChanged) {
                await cacheManager_1.CacheManager.clear("inventory_wip");
            }
            else {
                const cachedData = await redis_connect_1.default.get(cacheKey);
                if (cachedData) {
                    if (devEnvironment)
                        console.log("✅ Data Inventory Wip from Redis");
                    const parsed = JSON.parse(cachedData);
                    return { ...parsed, message: `Get all inventory wip sheets from cache` };
                }
            }
            const options = inventoryRepository_1.inventoryRepository.buildWipSheetOptions({
                page,
                pageSize,
                whereCondition: { qtyRemaining: { [sequelize_1.Op.gt]: 0 } },
            });
            const { rows, count } = await inventory_wip_sheets_1.InventoryWipSheets.findAndCountAll(options);
            const totals = await inventoryRepository_1.inventoryRepository.invWipSheetTotals();
            const responseData = {
                message: "Get all inventory wip sheets successfully",
                data: rows,
                totalInbounds: count,
                totalPages: Math.ceil(count / pageSize),
                currentPage: page,
                totalValueInventory: totals?.totalValueInventory || 0,
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
    getInvWipSheetByFields: async ({ page, pageSize, field, keyword, }) => {
        try {
            const validFields = ["orderId", "customerName"];
            if (!validFields.includes(field)) {
                throw appError_1.AppError.BadRequest(`Field '${field}' is not supported for search`, "INVALID_FIELD");
            }
            const index = meilisearch_connect_1.meiliClient.index("invWipSheets");
            const searchResult = await index.search(keyword, {
                attributesToSearchOn: [field],
                attributesToRetrieve: ["wipSheetId"],
                filter: "qtyRemaining > 0",
                sort: ["createdAt:desc"],
                page: Number(page) || 1,
                hitsPerPage: Number(pageSize) || 25, //pageSize
            });
            const wipSheetIds = searchResult.hits.map((hit) => hit.wipSheetId);
            if (wipSheetIds.length === 0) {
                return {
                    message: "No inventory wip sheets found",
                    data: [],
                    totalWipSheet: 0,
                    totalPages: 0,
                    currentPage: page,
                };
            }
            //query db
            const options = inventoryRepository_1.inventoryRepository.buildWipSheetOptions({
                whereCondition: { wipSheetId: { [sequelize_1.Op.in]: wipSheetIds } },
            });
            const { rows } = await inventory_wip_sheets_1.InventoryWipSheets.findAndCountAll(options);
            const totals = await inventoryRepository_1.inventoryRepository.invWipSheetTotals({
                wipSheetId: { [sequelize_1.Op.in]: rows.map((item) => item.wipSheetId) },
            });
            // Sắp xếp lại thứ tự của SQL theo đúng thứ tự của Meilisearch
            const finalData = wipSheetIds
                .map((id) => rows.find((inventory) => inventory.wipSheetId === id))
                .filter(Boolean);
            return {
                message: "Get inventory wip sheets from Meilisearch & DB successfully",
                data: finalData,
                totalWipSheet: searchResult.totalHits,
                totalPages: searchResult.totalPages,
                currentPage: searchResult.page,
                totalValueInventory: totals?.totalValueInventory || 0,
            };
        }
        catch (error) {
            console.error("Failed to get inventory wip sheets:", error);
            throw appError_1.AppError.ServerError();
        }
    },
    exportInventoryWipSheets: async ({ res, userName, fromDate, toDate, }) => {
        try {
            let whereCondition = {};
            if (fromDate && toDate) {
                const startTimestamp = dayjs_config_1.dayjsUtc.tz(fromDate, dayjs_config_1.VN_TZ).startOf("day").toDate();
                const endTimestamp = dayjs_config_1.dayjsUtc.tz(toDate, dayjs_config_1.VN_TZ).endOf("day").toDate();
                // console.log(`start: ${fromDate} - end: ${toDate}`);
                // console.log(`startTimestamp: ${startTimestamp} - endTimestamp: ${endTimestamp}`);
                whereCondition.createdAt = { [sequelize_1.Op.between]: [startTimestamp, endTimestamp] };
            }
            const baseQuery = inventoryRepository_1.inventoryRepository.buildWipSheetOptions({
                isExport: true,
                whereCondition,
            });
            await (0, excelExporter_1.exportExcelStreamResponse)(res, {
                baseQuery: baseQuery,
                model: inventory_wip_sheets_1.InventoryWipSheets,
                sheetName: "Tồn Kho BTP",
                fileName: "inventory_wip_sheets",
                columns: invWipSheetsRowAndColumn_1.invWipSheetsColumns,
                rows: invWipSheetsRowAndColumn_1.mappingInvWipSheetsRow,
                userName,
            });
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