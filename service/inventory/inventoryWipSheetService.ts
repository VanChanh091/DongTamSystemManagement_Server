import dotenv from "dotenv";
import { AppError } from "../../utils/appError";
import { InventoryWipSheets } from "../../models/warehouse/inventory/inventory_wip_sheets";
import { inventoryRepository } from "../../repository/warehouse/inventoryRepository";
import redisCache from "../../assets/configs/connect/redis.connect";
import { CacheKey } from "../../utils/helper/cache/cacheKey";
import { CacheManager } from "../../utils/helper/cache/cacheManager";
import { meiliClient } from "../../assets/configs/connect/meilisearch.connect";
import { Op } from "sequelize";
import { dayjsUtc, VN_TZ } from "../../assets/configs/dayjs/dayjs.config";
import { Response } from "express";
import { exportExcelStreamResponse } from "../../utils/helper/excelExporter";
import {
  invWipSheetsColumns,
  mappingInvWipSheetsRow,
} from "../../utils/mapping/warehouse/invWipSheetsRowAndColumn";
dotenv.config();

const devEnvironment = process.env.NODE_ENV !== "production";
const { inventory_wip } = CacheKey.warehouse;

export const invWipSheetService = {
  getAllInventoryWipSheets: async ({ page, pageSize }: { page: number; pageSize: number }) => {
    const cacheKey = inventory_wip.page(page);

    try {
      const { isChanged } = await CacheManager.check(InventoryWipSheets, "inventory_wip");

      if (isChanged) {
        await CacheManager.clear("inventory_wip");
      } else {
        const cachedData = await redisCache.get(cacheKey);
        if (cachedData) {
          if (devEnvironment) console.log("✅ Data Inventory Wip from Redis");
          const parsed = JSON.parse(cachedData);
          return { ...parsed, message: `Get all inventory wip sheets from cache` };
        }
      }

      const options = inventoryRepository.buildWipSheetOptions({
        page,
        pageSize,
        whereCondition: { qtyRemaining: { [Op.gt]: 0 } },
      });
      const { rows, count } = await InventoryWipSheets.findAndCountAll(options);

      const totals: any = await inventoryRepository.invWipSheetTotals();

      const responseData = {
        message: "Get all inventory wip sheets successfully",
        data: rows,
        totalInbounds: count,
        totalPages: Math.ceil(count / pageSize),
        currentPage: page,
        totalValueInventory: totals?.totalValueInventory || 0,
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
  }: {
    page: number;
    pageSize: number;
    field: string;
    keyword: string;
  }) => {
    try {
      const validFields = ["orderId", "customerName"];
      if (!validFields.includes(field)) {
        throw AppError.BadRequest(`Field '${field}' is not supported for search`, "INVALID_FIELD");
      }

      const index = meiliClient.index("invWipSheets");

      const searchResult = await index.search(keyword, {
        attributesToSearchOn: [field],
        attributesToRetrieve: ["wipSheetId"],
        filter: "qtyRemaining > 0",
        sort: ["createdAt:desc"],
        page: Number(page) || 1,
        hitsPerPage: Number(pageSize) || 25, //pageSize
      });

      const wipSheetIds = searchResult.hits.map((hit: any) => hit.wipSheetId);
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
      const options = inventoryRepository.buildWipSheetOptions({
        whereCondition: { wipSheetId: { [Op.in]: wipSheetIds } },
      });
      const { rows } = await InventoryWipSheets.findAndCountAll(options);

      const totals: any = await inventoryRepository.invWipSheetTotals({
        wipSheetId: { [Op.in]: rows.map((item) => item.wipSheetId) },
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
    } catch (error) {
      console.error("Failed to get inventory wip sheets:", error);
      throw AppError.ServerError();
    }
  },

  exportInventoryWipSheets: async ({
    res,
    userName,
    fromDate,
    toDate,
  }: {
    res: Response;
    userName: string;
    fromDate: string | Date;
    toDate: string | Date;
  }) => {
    try {
      let whereCondition: any = {};

      if (fromDate && toDate) {
        const startTimestamp = dayjsUtc.tz(fromDate, VN_TZ).startOf("day").toDate();
        const endTimestamp = dayjsUtc.tz(toDate, VN_TZ).endOf("day").toDate();

        // console.log(`start: ${fromDate} - end: ${toDate}`);
        // console.log(`startTimestamp: ${startTimestamp} - endTimestamp: ${endTimestamp}`);

        whereCondition.createdAt = { [Op.between]: [startTimestamp, endTimestamp] };
      }

      const baseQuery: any = inventoryRepository.buildWipSheetOptions({
        isExport: true,
        whereCondition,
      });

      await exportExcelStreamResponse(res, {
        baseQuery: baseQuery,
        model: InventoryWipSheets,
        sheetName: "Tồn Kho BTP",
        fileName: "inventory_wip_sheets",
        columns: invWipSheetsColumns,
        rows: mappingInvWipSheetsRow,
        userName,
      });
    } catch (error) {
      console.error("export inventory wip sheets failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },
};
