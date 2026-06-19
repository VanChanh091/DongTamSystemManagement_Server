import { Inventory } from "./inventory";
import { Order } from "../../order/order";
import { DataTypes, Model, Optional, Sequelize } from "sequelize";

export type actionInvType =
  | "INBOUND"
  | "OUTBOUND"
  | "ADJUSTMENT_OUTBOUND"
  | "CANCEL_OUTBOUND"
  | "LIQUIDATION"
  | "TRANSFER";

//định nghĩa trường trong bảng
export interface InventoryLogAttributes {
  inventoryLogId: number;
  changeQty: number;
  balanceAfter: number;
  valueAfter: number;
  type: actionInvType;

  createdAt?: Date;
  updatedAt?: Date;

  //FK
  inventoryId: number;
  orderId: string;
}

//cho phép bỏ qua khi tạo
export type InventoryLogCreationAttributes = Optional<
  InventoryLogAttributes,
  "inventoryLogId" | "createdAt" | "updatedAt"
>;

//định nghĩa kiểu OOP
export class InventoryLog
  extends Model<InventoryLogAttributes, InventoryLogCreationAttributes>
  implements InventoryLogAttributes
{
  declare inventoryLogId: number;
  declare changeQty: number;
  declare balanceAfter: number;
  declare valueAfter: number;
  declare type: actionInvType;

  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;

  //FK
  declare orderId: string;
  declare Order: Order;

  declare inventoryId: number;
  declare Inventory: Inventory;
}

export function initInventoryLogModel(sequelize: Sequelize): typeof InventoryLog {
  InventoryLog.init(
    {
      inventoryLogId: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      changeQty: { type: DataTypes.INTEGER, allowNull: false },
      balanceAfter: { type: DataTypes.INTEGER, allowNull: false },
      valueAfter: { type: DataTypes.INTEGER, allowNull: false },
      type: {
        type: DataTypes.ENUM(
          "INBOUND",
          "OUTBOUND",
          "ADJUSTMENT_OUTBOUND",
          "CANCEL_OUTBOUND",
          "LIQUIDATION",
          "TRANSFER",
        ),
        allowNull: false,
      },

      //FK
      inventoryId: { type: DataTypes.INTEGER, allowNull: false },
      orderId: { type: DataTypes.STRING, allowNull: false },
    },
    {
      sequelize,
      tableName: "InventoryLogs",
      timestamps: true,
      indexes: [
        //FK
        { fields: ["inventoryId"] },
        { fields: ["orderId"] },

        //indexes
        { fields: ["createdAt"] },
      ],
    },
  );

  return InventoryLog;
}
