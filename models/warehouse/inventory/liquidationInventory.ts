import { DataTypes, Model, Optional, Sequelize } from "sequelize";
import { Order } from "../../order/order";
import { Inventory } from "./inventory";

export type LiquidationStatus = "pending" | "selling" | "completed" | "cancelled";

//định nghĩa trường trong bảng
interface LiquidationInventoryAttributes {
  liquidationId: number;
  qtyTransferred: number;
  qtySold: number;
  qtyRemaining: number;
  liquidationValue: number;
  reason: string;
  status: LiquidationStatus;

  createdAt?: Date;
  updatedAt?: Date;

  //FK
  inventoryId: number;
  orderId: string;
}

//cho phép bỏ qua id khi tạo
export type LiquidationInventoryCreationAttributes = Optional<
  LiquidationInventoryAttributes,
  | "liquidationId"
  | "qtyTransferred"
  | "qtySold"
  | "qtyRemaining"
  | "liquidationValue"
  | "reason"
  | "status"
  | "createdAt"
  | "updatedAt"
>;

//định nghĩa kiểu OOP
export class LiquidationInventory
  extends Model<LiquidationInventoryAttributes, LiquidationInventoryCreationAttributes>
  implements LiquidationInventoryAttributes
{
  declare liquidationId: number;
  declare qtyTransferred: number;
  declare qtySold: number;
  declare qtyRemaining: number;
  declare liquidationValue: number;
  declare reason: string;
  declare status: LiquidationStatus;

  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;

  //FK
  declare orderId: string;
  declare Order: Order;

  declare inventoryId: number;
  declare Inventory: Inventory;
}

export function initLiquidationInventoryModel(sequelize: Sequelize): typeof LiquidationInventory {
  LiquidationInventory.init(
    {
      liquidationId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      qtyTransferred: { type: DataTypes.INTEGER, allowNull: false },
      qtySold: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      qtyRemaining: { type: DataTypes.INTEGER, allowNull: false },
      liquidationValue: { type: DataTypes.DOUBLE, allowNull: false },
      reason: { type: DataTypes.STRING, allowNull: false },
      status: {
        type: DataTypes.ENUM("pending", "selling", "completed", "cancelled"),
        allowNull: false,
        defaultValue: "pending",
      },

      //FK
      orderId: { type: DataTypes.STRING, allowNull: false },
      inventoryId: { type: DataTypes.INTEGER, allowNull: false },
    },
    {
      sequelize,
      tableName: "LiquidationInventory",
      timestamps: true,
      indexes: [
        //FK
        { fields: ["orderId"] },
        { fields: ["inventoryId"] },
      ],
    },
  );

  return LiquidationInventory;
}
