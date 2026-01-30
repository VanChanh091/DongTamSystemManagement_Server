import { DataTypes, Model, Optional, Sequelize } from "sequelize";
import { Order } from "../order/order";

//định nghĩa trường trong bảng
interface InventoryAttributes {
  inventoryId: number;
  totalQtyInbound: number;
  totalQtyOutbound: number;
  qtyInventory: number;
  valueInventory: number;
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
  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;

  //FK
  declare orderId: string;
  declare Order: Order;
}

export function initInventoryModel(sequelize: Sequelize): typeof Inventory {
  Inventory.init(
    {
      inventoryId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      totalQtyInbound: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      totalQtyOutbound: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      qtyInventory: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      valueInventory: { type: DataTypes.DOUBLE, allowNull: false, defaultValue: 0 },

      //FK
      orderId: { type: DataTypes.STRING, allowNull: false, unique: true },
    },
    {
      sequelize,
      tableName: "Inventory",
      timestamps: true,
      indexes: [
        //FK
        { unique: true, fields: ["orderId"] },

        //indexes
        { fields: ["qtyInventory"] },
      ],
    },
  );

  return Inventory;
}
