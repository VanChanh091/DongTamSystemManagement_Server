import { DataTypes, Model, Optional, Sequelize } from "sequelize";
import { Inventory } from "./inventory";

//định nghĩa trường trong bảng
interface InventoryTransfersAttributes {
  transferId: number;
  sourceId: string;
  targetId: string;
  qtyTransfers: number;
  reason?: string;
  transferBy: string;

  createdAt?: Date;
  updatedAt?: Date;

  //FK
  inventoryId: number;
}

//cho phép bỏ qua id khi tạo
export type InventoryTransfersCreationAttributes = Optional<
  InventoryTransfersAttributes,
  "transferId" | "reason" | "transferBy" | "createdAt" | "updatedAt"
>;

//định nghĩa kiểu OOP
export class InventoryTransfers
  extends Model<InventoryTransfersAttributes, InventoryTransfersCreationAttributes>
  implements InventoryTransfersAttributes
{
  declare transferId: number;
  declare sourceId: string;
  declare targetId: string;
  declare qtyTransfers: number;
  declare reason?: string;
  declare transferBy: string;

  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;

  //FK
  declare inventoryId: number;
  declare Inventory: Inventory;
}

export function initInventoryTransfersModel(sequelize: Sequelize): typeof InventoryTransfers {
  InventoryTransfers.init(
    {
      transferId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      sourceId: { type: DataTypes.STRING, allowNull: false },
      targetId: { type: DataTypes.STRING, allowNull: false },
      qtyTransfers: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      reason: { type: DataTypes.STRING },
      transferBy: { type: DataTypes.STRING, allowNull: false },

      //FK
      inventoryId: { type: DataTypes.INTEGER, allowNull: false },
    },
    {
      sequelize,
      tableName: "InventoryTransfers",
      timestamps: true,
      indexes: [
        //FK
        { fields: ["inventoryId"] },

        // indexes
        // { fields: ["qtyInventory"] },
      ],
    },
  );

  return InventoryTransfers;
}
