import { DataTypes, Model, Optional, Sequelize } from "sequelize";
import { Order } from "../../order/order";
import { LiquidationInventory } from "./liquidationInventory";
import { InventoryTransfers } from "./inventoryTransfers";

//định nghĩa trường trong bảng
interface InventoryAttributes {
  inventoryId: number;
  totalQtyInbound: number;
  totalQtyOutbound: number;
  qtyInventory: number;
  valueInventory: number;
  dateInbound?: Date;

  createdAt?: Date;
  updatedAt?: Date;

  //FK
  orderId: string;
}

//cho phép bỏ qua id khi tạo
export type InventoryCreationAttributes = Optional<
  InventoryAttributes,
  | "inventoryId"
  | "totalQtyInbound"
  | "totalQtyOutbound"
  | "qtyInventory"
  | "valueInventory"
  | "dateInbound"
  | "createdAt"
  | "updatedAt"
>;

//định nghĩa kiểu OOP
export class Inventory
  extends Model<InventoryAttributes, InventoryCreationAttributes>
  implements InventoryAttributes
{
  declare inventoryId: number;
  declare totalQtyInbound: number;
  declare totalQtyOutbound: number;
  declare qtyInventory: number;
  declare valueInventory: number;
  declare dateInbound?: Date;

  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;

  //FK
  declare orderId: string;
  declare Order: Order;

  declare liquidation?: LiquidationInventory;
  declare invTransfers?: InventoryTransfers[];
}

export function initInventoryModel(sequelize: Sequelize): typeof Inventory {
  Inventory.init(
    {
      inventoryId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      totalQtyInbound: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      totalQtyOutbound: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      qtyInventory: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      valueInventory: { type: DataTypes.DOUBLE, allowNull: false, defaultValue: 0 },
      dateInbound: { type: DataTypes.DATE },

      //FK
      orderId: { type: DataTypes.STRING, allowNull: false },
    },
    {
      sequelize,
      tableName: "Inventory",
      timestamps: true,
      indexes: [
        //FK
        { fields: ["orderId"] },

        //indexes
        { fields: ["qtyInventory"] },
      ],
    },
  );

  return Inventory;
}
