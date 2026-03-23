import dotenv from "dotenv";
dotenv.config();

import { Response } from "express";
import { AppError } from "../../utils/appError";
import { CacheKey } from "../../utils/helper/cache/cacheKey";
import { Inventory } from "../../models/warehouse/inventory";
import { exportExcelResponse } from "../../utils/helper/excelExporter";
import { warehouseRepository } from "../../repository/warehouseRepository";
import { inventoryColumns, mappingInventoryRow } from "../../utils/mapping/inventoryRowAndColumn";
import redisCache from "../../assest/configs/redisCache";
import { CacheManager } from "../../utils/helper/cache/cacheManager";

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

      await redisCache.set(cacheKey, JSON.stringify(responseData), "EX", 3600);

      return responseData;
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
