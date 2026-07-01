import { Response } from "express";
import { AppError } from "../../utils/appError";
import { Order } from "../../models/order/order";
import { literal, Op, Transaction } from "sequelize";
import { Product } from "../../models/product/product";
import { Customer } from "../../models/customer/customer";
import {
  actionInvType,
  InventoryLog,
  InventoryLogAttributes,
} from "../../models/warehouse/inventory/inventoryLog";
import { dayjsUtc } from "../../assets/configs/dayjs/dayjs.config";
import { exportExcelStreamResponse } from "../../utils/helper/excelExporter";
import {
  inventoryColumns,
  mappingInventoryRow,
} from "../../utils/mapping/warehouse/inventoryRowAndColumn";
import { Inventory } from "../../models/warehouse/inventory/inventory";
import { runInTransaction } from "../../utils/helper/transactionHelper";

export const inventoryLogService = {
  migrateInitialInventoryLogs: async () => {
    try {
      return await runInTransaction(async (transaction) => {
        const hasLog = await InventoryLog.findOne({ type: "INITIAL", transaction });
        if (hasLog) {
          throw AppError.BadRequest("Initial inventory logs already exist", "INITIAL_LOGS_EXIST");
        }

        const inventories = await Inventory.findAll({
          where: { qtyInventory: { [Op.ne]: 0 } },
          transaction,
        });
        if (inventories.length === 0) {
          throw AppError.NotFound("No inventories found to migrate", "NO_INVENTORIES");
        }

        const initialLogs = inventories.map((inv) => ({
          inventoryId: inv.inventoryId,
          orderId: inv.orderId,
          changeQty: inv.qtyInventory,
          balanceAfter: inv.qtyInventory,
          valueAfter: inv.valueInventory,
          createdAt: inv.updatedAt,
          updatedAt: inv.updatedAt,
          type: "INITIAL" as actionInvType,
        }));

        await InventoryLog.bulkCreate(initialLogs, { transaction });

        return { message: "Initial inventory logs migrated successfully" };
      });
    } catch (error) {
      console.error("Failed to migrate initial inventory logs:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  followInventoryChange: async ({
    items,
    type,
    transaction,
  }: {
    items: { inventoryId: number; changeQty: number }[];
    type: actionInvType;
    transaction: Transaction;
  }) => {
    try {
      const inventoryIds = items.map((item) => item.inventoryId);
      const inventories = await Inventory.findAll({
        where: { inventoryId: { [Op.in]: inventoryIds } },
        transaction,
      });
      if (inventories.length === 0) {
        throw AppError.NotFound("Inventory not found", "INVENTORY_NOT_FOUND");
      }

      const inventoryMap = new Map(inventories.map((inv) => [inv.inventoryId, inv]));
      const logsToCreate: InventoryLogAttributes[] = [];

      for (const item of items) {
        const inv = inventoryMap.get(item.inventoryId);
        if (!inv) continue;

        logsToCreate.push({
          inventoryId: inv.inventoryId,
          orderId: inv.orderId,
          changeQty: item.changeQty, // Lượng biến động do logic bên ngoài truyền vào
          balanceAfter: inv.qtyInventory, // Bốc luôn số lượng sau update của bảng chính
          valueAfter: inv.valueInventory, // Bốc luôn giá trị sau update của bảng chính (đã bằng 0 nếu âm)
          type,
        } as any);
      }

      await InventoryLog.bulkCreate(logsToCreate, { transaction });

      return { message: "Inventory change logged successfully" };
    } catch (error) {
      console.error("Failed to handle inventory change:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  exportInventoryByDate: async (res: Response, userName: string, targetDate: Date) => {
    try {
      // const endDate = dayjsUtc.utc(targetDate).format("YYYY-MM-DD 23:59:59");
      // const dateTimestamp = dayjsUtc(targetDate).endOf("day").toDate();
      // const dateTimestamp = dayjsUtc(targetDate).toDate();
      const dateTimestamp = dayjsUtc(targetDate).format("YYYY-MM-DD HH:mm:ss");

      console.log(`time: ${dateTimestamp}`);

      const baseQuery: any = {
        where: {
          inventoryLogId: {
            [Op.in]: literal(`(
            SELECT MAX(sub_logs.inventoryLogId)
            FROM inventorylogs AS sub_logs
            WHERE sub_logs.createdAt <= :targetDate
            GROUP BY sub_logs.inventoryId
          )`),
          },
          balanceAfter: { [Op.gt]: 0 },
        },
        attributes: ["inventoryId", "orderId", "balanceAfter", "valueAfter", "createdAt"],
        replacements: { targetDate: dateTimestamp },
        order: [["inventoryId", "ASC"]],

        include: [
          {
            model: Inventory,
            attributes: ["inventoryId", "orderId", "totalQtyInbound", "totalQtyOutbound"],
          },
          {
            model: Order,
            attributes: [
              "orderId",
              "dayReceiveOrder",
              "QC_box",
              "flute",
              "day",
              "matE",
              "matB",
              "matC",
              "matE2",
              "songE",
              "songB",
              "songC",
              "songE2",
              "paperSizeManufacture",
              "lengthPaperManufacture",
              "quantityCustomer",
              "dvt",
              "pricePaper",
            ],
            include: [
              { model: Customer, attributes: ["customerName"] },
              { model: Product, attributes: ["productName"] },
            ],
          },
        ],
      };

      const formattedDate = dayjsUtc.utc(dateTimestamp).format("YYYY-MM-DD");

      await exportExcelStreamResponse(res, {
        baseQuery: baseQuery,
        model: InventoryLog,
        sheetName: `Chốt Tồn Kho`,
        fileName: `inventory_${formattedDate}`,
        columns: inventoryColumns,
        rows: mappingInventoryRow,
        userName,
        includeDate: false,
      });
    } catch (error) {
      console.error("Failed to get inventory logs by date:", error);
      throw AppError.ServerError();
    }
  },
};
