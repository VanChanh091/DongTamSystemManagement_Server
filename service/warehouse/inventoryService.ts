import dotenv from "dotenv";
dotenv.config();

import { Op } from "sequelize";
import { Response } from "express";
import { AppError } from "../../utils/appError";
import { searchFieldAtribute } from "../../interface/types";
import { CacheKey } from "../../utils/helper/cache/cacheKey";
import { Inventory } from "../../models/warehouse/inventory";
import redisCache from "../../assest/configs/connect/redis.config";
import { CacheManager } from "../../utils/helper/cache/cacheManager";
import { exportExcelResponse } from "../../utils/helper/excelExporter";
import { warehouseRepository } from "../../repository/warehouseRepository";
import { meiliClient } from "../../assest/configs/connect/melisearch.config";
import { inventoryColumns, mappingInventoryRow } from "../../utils/mapping/inventoryRowAndColumn";

const devEnvironment = process.env.NODE_ENV !== "production";
const { inventory } = CacheKey.warehouse;

export const inventoryService = {
  getAllInventory: async (page: number, pageSize: number) => {
    const cacheKey = inventory.page(page);

    try {
      const { isChanged } = await CacheManager.check(Inventory, "inventory");
      if (isChanged) {
        await CacheManager.clear("inventory");
      } else {
        const cachedData = await redisCache.get(cacheKey);
        if (cachedData) {
          if (devEnvironment) console.log("✅ Data inventory from Redis");
          return { ...JSON.parse(cachedData), message: `Get all inventory from cache` };
        }
      }

      const { rows, count } = await warehouseRepository.getInventoryByPage({ page, pageSize });
      const totals: any = await warehouseRepository.inventoryTotals();

      const responseData = {
        message: "Get all inventory successfully",
        data: rows,
        totalInventory: count,
        totalPages: Math.ceil(count / pageSize),
        currentPage: page,
        totalValueInventory: totals?.totalValueInventory || 0,
      };

      await redisCache.set(cacheKey, JSON.stringify(responseData), "EX", 3600);

      return responseData;
    } catch (error) {
      console.error("Failed to get inventory:", error);
      throw AppError.ServerError();
    }
  },

  getInventoryByField: async ({ field, keyword, page, pageSize }: searchFieldAtribute) => {
    try {
      const validFields = ["orderId", "customerName"];
      if (!validFields.includes(field)) {
        throw AppError.BadRequest(`Field '${field}' is not supported for search`, "INVALID_FIELD");
      }

      const index = meiliClient.index("inventories");

      const searchResult = await index.search(keyword, {
        attributesToSearchOn: [field],
        attributesToRetrieve: ["inventoryId"],
        page: Number(page) || 1,
        hitsPerPage: Number(pageSize) || 25, //pageSize
      });

      const inventoryIds = searchResult.hits.map((hit: any) => hit.inventoryId);
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
      const { rows } = await warehouseRepository.getInventoryByPage({
        searching: { inventoryId: { [Op.in]: inventoryIds } },
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
    } catch (error) {
      console.error("Failed to get inventory:", error);
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

  exportExcelInventory: async (res: Response) => {
    try {
      const { rows } = await warehouseRepository.getInventoryByPage({});

      await exportExcelResponse(res, {
        data: rows,
        sheetName: "Tồn Kho",
        fileName: "inventory",
        columns: inventoryColumns,
        rows: mappingInventoryRow,
      });
    } catch (error) {
      console.error("Error create inventory:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },
};
