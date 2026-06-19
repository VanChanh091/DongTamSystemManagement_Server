import { Op, Transaction } from "sequelize";
import { AppError } from "../../utils/appError";
import { Inventory } from "../../models/warehouse/inventory/inventory";
import {
  actionInvType,
  InventoryLog,
  InventoryLogAttributes,
} from "../../models/warehouse/inventory/inventoryLog";

export const inventoryLogService = {
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
};
