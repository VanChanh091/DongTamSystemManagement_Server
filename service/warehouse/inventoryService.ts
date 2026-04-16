import dotenv from "dotenv";
dotenv.config();

import { Op } from "sequelize";
import { Response } from "express";
import { AppError } from "../../utils/appError";
import { searchFieldAtribute } from "../../interface/types";
import { CacheKey } from "../../utils/helper/cache/cacheKey";
import { Inventory } from "../../models/warehouse/inventory/inventory";
import redisCache from "../../assets/configs/connect/redis.connect";
import { CacheManager } from "../../utils/helper/cache/cacheManager";
import { exportExcelResponse } from "../../utils/helper/excelExporter";
import { inventoryRepository } from "../../repository/inventoryRepository";
import { meiliClient } from "../../assets/configs/connect/meilisearch.connect";
import { inventoryColumns, mappingInventoryRow } from "../../utils/mapping/inventoryRowAndColumn";
import { runInTransaction } from "../../utils/helper/transactionHelper";
import { Order } from "../../models/order/order";
import { LiquidationInventory } from "../../models/warehouse/inventory/liquidationInventory";

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

      const { rows, count } = await inventoryRepository.getInventoryByPage({ page, pageSize });
      const totals: any = await inventoryRepository.inventoryTotals();

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
      const { rows } = await inventoryRepository.getInventoryByPage({
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

      const existedInventory = await inventoryRepository.findByOrderId({ orderId, transaction });
      if (existedInventory) {
        return existedInventory;
      }

      return await Inventory.create({ orderId }, { transaction });
    } catch (error) {
      console.error("Failed to create inventory:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  transferOrderQty: async (data: {
    sourceOrderId: string;
    targetOrderId: string;
    qtyTransfer: number;
  }) => {
    const { sourceOrderId, targetOrderId, qtyTransfer } = data;

    try {
      return await runInTransaction(async (transaction) => {
        // Tìm và Check tồn
        const sourceInv = await inventoryRepository.findByOrderId({
          orderId: sourceOrderId,
          transaction,
          options: {
            include: [
              {
                model: Order,
                attributes: ["flute", "pricePaper", "lengthPaperCustomer", "paperSizeCustomer"],
              },
            ],
          },
        });
        if (!sourceInv) {
          throw AppError.NotFound(
            `Source inventory with orderId ${sourceOrderId} not found`,
            "SOURCE_INVENTORY_NOT_FOUND",
          );
        }

        // Check đủ số lượng để chuyển giao không
        if (sourceInv.qtyInventory < qtyTransfer) {
          throw AppError.BadRequest(
            `Insufficient quantity in source inventory`,
            "INSUFFICIENT_QUANTITY",
          );
        }

        //Lấy thông tin đơn hàng đích để có giá tấm
        const order = await Order.findOne({
          where: { orderId: targetOrderId },
          attributes: [
            "orderId",
            "flute",
            "status",
            "pricePaper",
            "lengthPaperCustomer",
            "paperSizeCustomer",
            "quantityCustomer",
            "quantityManufacture",
          ],
          transaction,
        });
        if (!order) {
          throw AppError.NotFound(
            `Target order with orderId ${targetOrderId} not found`,
            "TARGET_ORDER_NOT_FOUND",
          );
        }

        //xử lý cho đơn hàng nguồn
        const sourcePrice = sourceInv.Order.pricePaper || 0;
        const remainingQty = sourceInv.qtyInventory - qtyTransfer;

        const newValueSource = remainingQty > 0 ? remainingQty * sourcePrice : 0;
        const valuePriceSource = sourceInv.valueInventory - newValueSource;

        //xử lý cho đơn đích
        const unitPrice = order.pricePaper || 0;
        const addedValue = qtyTransfer * unitPrice;

        await sourceInv.decrement(
          { qtyInventory: qtyTransfer, valueInventory: valuePriceSource },
          { transaction },
        );
        await sourceInv.reload({ transaction });

        // if (sourceInv.qtyInventory <= 0) {
        //   await sourceInv.destroy({ transaction });
        // }

        // Xử lý cộng kho đích
        const targetInv = await inventoryRepository.findByOrderId({
          orderId: targetOrderId,
          transaction,
        });

        if (targetInv) {
          // Đã có record: Tăng cả lượng và tổng giá trị
          await targetInv.increment(
            { qtyInventory: qtyTransfer, valueInventory: addedValue },
            { transaction },
          );
        } else {
          await Inventory.create(
            {
              orderId: targetOrderId,
              qtyInventory: qtyTransfer,
              valueInventory: addedValue,
            },
            { transaction },
          );
        }

        //check đã đủ số lượng cho đơn hàng chưa để chuyển trạng thái đơn hàng
        const totalInventory = await Inventory.sum("qtyInventory", {
          where: { orderId: targetOrderId },
          transaction,
        });

        let newStatus = order.status;
        if (totalInventory >= order.quantityCustomer) {
          newStatus = "planning";
        }

        //trừ số lượng đã chuyển giao khỏi quantityManufacture của đơn hàng
        const newQtyManufacture = Math.max(0, order.quantityManufacture - qtyTransfer);

        await order.update(
          { quantityManufacture: newQtyManufacture, status: newStatus },
          { transaction },
        );

        return {
          message: "Transfer quantity successfully",
          remainingQtyManufacture: newQtyManufacture,
          status: newStatus,
        };
      });
    } catch (error) {
      console.log("err to transfer qty: ", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  transferQtyToLiquidationInv: async ({
    inventoryId,
    qtyTransfer,
    reason,
  }: {
    inventoryId: number;
    qtyTransfer: number;
    reason: string;
  }) => {
    try {
      return await runInTransaction(async (transaction) => {
        const inventory = await Inventory.findOne({
          where: { inventoryId },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (!inventory) {
          throw AppError.NotFound(
            `Inventory with id ${inventoryId} not found`,
            "INVENTORY_NOT_FOUND",
          );
        }

        // Check đủ số lượng để chuyển giao không
        if (inventory.qtyInventory < qtyTransfer) {
          throw AppError.BadRequest(`Insufficient quantity in inventory`, "INSUFFICIENT_QUANTITY");
        }

        //tính giá trị chuyển đổi
        const transferValue = Math.round(
          (inventory.valueInventory / inventory.qtyInventory) * qtyTransfer,
        );

        await inventory.update(
          {
            qtyInventory: inventory.qtyInventory - qtyTransfer,
            totalQtyOutbound: inventory.totalQtyOutbound + qtyTransfer,
            valueInventory: inventory.valueInventory - transferValue,
          },
          { transaction },
        );

        const liquidationInv = await LiquidationInventory.findOne({
          where: { inventoryId },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });

        if (liquidationInv) {
          await liquidationInv.increment(
            {
              qtyTransferred: qtyTransfer,
              qtyRemaining: qtyTransfer,
              liquidationValue: transferValue,
            },
            { transaction },
          );
        } else {
          await LiquidationInventory.create(
            {
              qtyTransferred: qtyTransfer,
              qtyRemaining: qtyTransfer,
              liquidationValue: transferValue,
              reason,
              inventoryId,
              orderId: inventory.orderId,
            },
            { transaction },
          );
        }

        return { message: "Transfer quantity to liquidation inventory successfully" };
      });
    } catch (error) {
      console.log("err to transfer qty to liquidation inventory: ", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  exportExcelInventory: async (res: Response) => {
    try {
      const { rows } = await inventoryRepository.getInventoryByPage({});

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
