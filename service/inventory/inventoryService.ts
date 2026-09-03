import dotenv from "dotenv";
dotenv.config();

import { Op, Sequelize } from "sequelize";
import { Request, Response } from "express";
import { User } from "../../models/user/user";
import { meiliService } from "../system/meiliService";
import { AppError } from "../../utils/appError";
import { Order } from "../../models/order/order";
import { MEILI_INDEX } from "../../assets/labelFields";
import { searchFieldAtribute } from "../../interface/types";
import { CacheKey } from "../../utils/helper/cache/cacheKey";
import { dayjsUtc } from "../../assets/configs/dayjs/dayjs.config";
import redisCache from "../../assets/configs/connect/redis.connect";
import { CacheManager } from "../../utils/helper/cache/cacheManager";
import { Inventory } from "../../models/warehouse/inventory/inventory";
import { runInTransaction } from "../../utils/helper/transactionHelper";
import { inventoryRepository } from "../../repository/inventoryRepository";
import { meiliClient } from "../../assets/configs/connect/meilisearch.connect";
import { exportExcelStreamResponse } from "../../utils/helper/excelExporter";
import { InventoryTransfers } from "../../models/warehouse/inventory/inventoryTransfers";
import { LiquidationInventory } from "../../models/warehouse/inventory/liquidationInventory";
import {
  inventoryColumns,
  mappingInventoryRow,
} from "../../utils/mapping/warehouse/inventoryRowAndColumn";
import { inventoryLogService } from "./inventoryLogService";

const devEnvironment = process.env.NODE_ENV !== "production";
const { inventory_gt, inventory_lt } = CacheKey.warehouse;

export const inventoryService = {
  getAllInventory: async (page: number, pageSize: number, filter: "gtZero" | "ltZero") => {
    const cacheKey = filter === "gtZero" ? inventory_gt.page(page) : inventory_lt.page(page);
    const cachName = filter === "gtZero" ? "inventory_gt" : "inventory_lt";

    try {
      const { isChanged } = await CacheManager.check(Inventory, cachName);

      if (isChanged) {
        await CacheManager.clear(cachName);
      } else {
        const cachedData = await redisCache.get(cacheKey);
        if (cachedData) {
          if (devEnvironment) console.log("✅ Data inventory from Redis");
          return { ...JSON.parse(cachedData), message: `Get all inventory from cache` };
        }
      }

      const options = inventoryRepository.buildInventoryOptions({ page, pageSize, filter });
      const { rows, count } = await Inventory.findAndCountAll(options);

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

  getInventoryByField: async ({ field, keyword, page, pageSize, filter }: searchFieldAtribute) => {
    try {
      const validFields = ["orderId", "customerName", "fullName"];
      if (!validFields.includes(field)) {
        throw AppError.BadRequest(`Field '${field}' is not supported for search`, "INVALID_FIELD");
      }

      const index = meiliClient.index("inventories");
      const filterCondition = filter === "gtZero" ? "qtyInventory > 0" : "qtyInventory < 0";

      const searchResult = await index.search(keyword, {
        attributesToSearchOn: [field],
        attributesToRetrieve: ["inventoryId"],
        filter: filterCondition,
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
      const options = inventoryRepository.buildInventoryOptions({
        searching: { inventoryId: { [Op.in]: inventoryIds } },
        filter: filter!,
      });
      const { rows } = await Inventory.findAndCountAll(options);

      const totals: any = await inventoryRepository.inventoryTotals({
        inventoryId: { [Op.in]: rows.map((inv) => inv.inventoryId) },
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
        totalValueInventory: totals?.totalValueInventory || 0,
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

      const existedInventory = await inventoryRepository.findInvByOrderId({
        orderId,
        transaction,
        options: { lock: transaction?.LOCK.UPDATE },
      });

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

  transferOrderQty: async (
    req: Request,
    data: {
      sourceOrderId: string;
      targetOrderId: string;
      qtyTransfer: number;
      reason?: string;
    },
  ) => {
    const { sourceOrderId, targetOrderId, qtyTransfer, reason } = data;

    try {
      return await runInTransaction(async (transaction) => {
        // Tìm và Check tồn
        const sourceInv = await inventoryRepository.findInvByOrderId({
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
        const order = await inventoryRepository.getTargetOrder(targetOrderId, transaction);
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

        // Xử lý cộng kho đích
        let targetInv = await inventoryRepository.findInvByOrderId({
          orderId: targetOrderId,
          transaction,
          options: { lock: transaction.LOCK.UPDATE },
        });

        let newQtyTarget = 0;

        if (targetInv) {
          newQtyTarget = targetInv.qtyInventory + qtyTransfer;
          const newValueTarget = newQtyTarget > 0 ? newQtyTarget * unitPrice : 0;
          const valueDeltaTarget = newValueTarget - targetInv.valueInventory;

          await targetInv.increment(
            { qtyInventory: qtyTransfer, valueInventory: valueDeltaTarget },
            { transaction },
          );
        } else {
          newQtyTarget = qtyTransfer;
          targetInv = await Inventory.create(
            {
              orderId: targetOrderId,
              qtyInventory: qtyTransfer,
              valueInventory: addedValue,
            },
            { transaction },
          );
        }

        //trừ số lượng đã chuyển giao khỏi quantityManufacture của đơn hàng
        const newQtyManufacture = Math.max(0, order.quantityManufacture - qtyTransfer);

        let newStatus = order.status;
        if (newQtyManufacture == 0) newStatus = "planning";

        await order.update(
          { quantityManufacture: newQtyManufacture, status: newStatus },
          { transaction },
        );

        // Lấy tên người dùng để ghi log
        const userName = await User.findOne({ where: { userId: req.user.userId }, transaction });

        // Ghi log chuyển kho
        await InventoryTransfers.create(
          {
            sourceId: sourceOrderId,
            targetId: targetOrderId,
            qtyTransfers: qtyTransfer,
            reason,
            transferBy: userName?.fullName,
            inventoryId: sourceInv.inventoryId,
          },
          { transaction },
        );

        //inventory logs
        await inventoryLogService.followInventoryChange({
          items: [
            { inventoryId: sourceInv.inventoryId, changeQty: -qtyTransfer },
            { inventoryId: targetInv?.inventoryId || 0, changeQty: qtyTransfer },
          ],
          type: "TRANSFER",
          transaction,
        });

        //--------------------MEILISEARCH-----------------------
        //  Xử lý Source Inventory
        if (remainingQty === 0) {
          // bằng 0 -> Xóa khỏi Meilisearch
          await meiliService.deleteMeiliData({
            indexKey: MEILI_INDEX.INVENTORIES,
            idOrIds: sourceInv.inventoryId,
            transaction,
          });
        } else {
          // Vẫn khác 0 -> Cập nhật lại số lượng
          await meiliService.syncOrUpdateMeiliData({
            indexKey: MEILI_INDEX.INVENTORIES,
            data: {
              inventoryId: sourceInv.inventoryId,
              qtyInventory: sourceInv.qtyInventory,
            },
            transaction,
            isUpdate: true,
          });
        }

        // Xử lý Target Inventory:
        if (newQtyTarget === 0) {
          const targetFullInvs = await inventoryRepository.syncInventoryForMeili(
            targetOrderId,
            transaction,
          );

          if (!targetFullInvs) {
            await meiliService.syncOrUpdateMeiliData({
              indexKey: MEILI_INDEX.INVENTORIES,
              data: targetFullInvs,
              transaction,
            });
          }
        } else {
          // Nếu sau khi cộng mà bù vừa khớp về đúng 0 -> Xóa khỏi Meilisearch
          await meiliService.deleteMeiliData({
            indexKey: MEILI_INDEX.INVENTORIES,
            idOrIds: targetInv.inventoryId,
            transaction,
          });
        }

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

        const remainingQty = inventory.qtyInventory - qtyTransfer;
        await inventory.update(
          {
            valueInventory: remainingQty,
            qtyInventory: inventory.qtyInventory - qtyTransfer,
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

        //inventory logs
        await inventoryLogService.followInventoryChange({
          items: [{ inventoryId: inventory.inventoryId, changeQty: -qtyTransfer }],
          type: "LIQUIDATION",
          transaction,
        });

        //--------------------MEILISEARCH-----------------------
        if (remainingQty === 0) {
          // Hết tồn kho do thanh lý toàn bộ
          await meiliService.deleteMeiliData({
            indexKey: MEILI_INDEX.INVENTORIES,
            idOrIds: inventory.inventoryId,
            transaction,
          });
        } else {
          // Vẫn còn tồn kho một phầ
          await meiliService.syncOrUpdateMeiliData({
            indexKey: MEILI_INDEX.INVENTORIES,
            data: { inventoryId: inventory.inventoryId, qtyInventory: remainingQty },
            transaction,
            isUpdate: true,
          });
        }

        return { message: "Transfer quantity to liquidation inventory successfully" };
      });
    } catch (error) {
      console.log("err to transfer qty to liquidation inventory: ", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  transferToQtyVariance: async ({ inventoryIds }: { inventoryIds: number[] }) => {
    try {
      return await runInTransaction(async (transaction) => {
        const inventories = await Inventory.findAll({
          where: { inventoryId: { [Op.in]: inventoryIds } },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });

        if (inventories.length === 0) {
          throw AppError.NotFound("Inventory not found", "INVENTORY_NOT_FOUND");
        }

        const uniqueInventoryIds = [...new Set(inventories.map((inv) => inv.inventoryId))];
        const qtyVariance = inventories.reduce((total, inv) => total + inv.qtyInventory, 0);

        await Inventory.update(
          {
            qtyVariance: qtyVariance,
            qtyInventory: 0,
            valueInventory: 0,
          },
          { where: { inventoryId: { [Op.in]: uniqueInventoryIds } }, transaction },
        );

        //inventory logs
        await inventoryLogService.followInventoryChange({
          items: uniqueInventoryIds.map((id) => ({ inventoryId: id, changeQty: qtyVariance })),
          type: "ADJUSTMENT",
          transaction,
        });

        //--------------------MEILISEARCH-----------------------
        await meiliService.deleteMeiliData({
          indexKey: MEILI_INDEX.INVENTORIES,
          idOrIds: uniqueInventoryIds,
          transaction,
        });

        return { message: "Transfer quantity to variance successfully" };
      });
    } catch (error) {
      console.log("err to transfer qty to liquidation inventory: ", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  exportExcelInventory: async (res: Response, userName: string, date?: any) => {
    try {
      let whereCondition: any = {};

      if (date) {
        const dateTimestamp = dayjsUtc(date).startOf("day").toDate();

        // console.log(`date: ${date}`);
        // console.log(`dateTimestamp: ${dateTimestamp}`);

        whereCondition.dateInbound = { [Op.lt]: dateTimestamp };
      }

      const baseQuery: any = inventoryRepository.buildInventoryOptions({
        isExport: true,
        searching: whereCondition,
      });

      await exportExcelStreamResponse(res, {
        baseQuery: baseQuery,
        model: Inventory,
        sheetName: "Tồn Kho",
        fileName: "inventory",
        columns: inventoryColumns,
        rows: mappingInventoryRow,
        userName,
      });
    } catch (error) {
      console.error("Error create inventory:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },
};
