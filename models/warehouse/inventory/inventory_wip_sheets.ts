import { Order } from "../../order/order";
import { DataTypes, Model, Optional, Sequelize } from "sequelize";
import { PlanningPaper } from "../../planning/planningPaper";

export type InventoryWipSheetsStatus = "in_wip" | "completed" | "canceled";

//định nghĩa trường trong bảng
interface InventoryWipSheetsAttributes {
  wipSheetId: number;
  qtyProduced: number;
  qtyRemaining: number;
  unitPrice: number;
  totalPrice: number;
  inboundedAt?: Date;
  status: InventoryWipSheetsStatus;

  createdAt?: Date;
  updatedAt?: Date;

  //FK
  planningId: number;
  orderId: string;
}

//cho phép bỏ qua khi tạo
export type InventoryWipSheetsCreationAttributes = Optional<
  InventoryWipSheetsAttributes,
  "wipSheetId" | "totalPrice" | "inboundedAt" | "status" | "createdAt" | "updatedAt"
>;

//định nghĩa kiểu OOP
export class InventoryWipSheets
  extends Model<InventoryWipSheetsAttributes, InventoryWipSheetsCreationAttributes>
  implements InventoryWipSheetsAttributes
{
  declare wipSheetId: number;
  declare qtyProduced: number;
  declare qtyRemaining: number;
  declare unitPrice: number;
  declare totalPrice: number;
  declare inboundedAt?: Date;
  declare status: InventoryWipSheetsStatus;

  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;

  //FK
  declare planningId: number;
  declare PlanningPaper: PlanningPaper[];

  declare orderId: string;
  declare Order: Order[];
}

export function initInventoryWipSheetsModel(sequelize: Sequelize): typeof InventoryWipSheets {
  InventoryWipSheets.init(
    {
      wipSheetId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      qtyProduced: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      qtyRemaining: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      unitPrice: { type: DataTypes.DOUBLE, allowNull: false, defaultValue: 0 },
      totalPrice: { type: DataTypes.DOUBLE, allowNull: false, defaultValue: 0 },
      inboundedAt: { type: DataTypes.DATE, allowNull: true },
      status: {
        type: DataTypes.ENUM("in_wip", "completed", "canceled"),
        allowNull: false,
        defaultValue: "in_wip",
      },

      //FK
      planningId: { type: DataTypes.INTEGER, allowNull: false },
      orderId: { type: DataTypes.STRING, allowNull: false },
    },
    {
      sequelize,
      tableName: "inventory_wip_sheets",
      timestamps: true,
      indexes: [
        //FK
        { fields: ["orderId"] },
        { fields: ["planningId"] },

        //indexes
        { fields: ["status", "createdAt"] },
      ],
    },
  );

  return InventoryWipSheets;
}
