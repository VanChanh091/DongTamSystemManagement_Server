import { DataTypes, Model, Optional, Sequelize } from "sequelize";
import { Order } from "./order";

export type actionType = "APPROVED" | "RETURNED";

//định nghĩa trường trong bảng
interface OrderApprovedAttributes {
  approverId: number;
  approvedBy: string;
  action: actionType;

  //FK
  orderId: string;

  createdAt?: Date;
  updatedAt?: Date;
}

//cho phép bỏ qua id khi tạo
export type OrderApprovedCreationAttributes = Optional<
  OrderApprovedAttributes,
  "approverId" | "action" | "createdAt" | "updatedAt"
>;

//định nghĩa kiểu OOP
export class OrderApproved
  extends Model<OrderApprovedAttributes, OrderApprovedCreationAttributes>
  implements OrderApprovedAttributes
{
  declare approverId: number;
  declare approvedBy: string;
  declare action: actionType;

  //FK
  declare orderId: string;
  declare Order: Order;

  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;
}

export function initOrderApprovedModel(sequelize: Sequelize): typeof OrderApproved {
  OrderApproved.init(
    {
      approverId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      approvedBy: { type: DataTypes.STRING, allowNull: false },
      action: {
        type: DataTypes.ENUM("APPROVED", "RETURNED"),
        allowNull: false,
        defaultValue: "APPROVED",
      },

      //FK
      orderId: { type: DataTypes.STRING, allowNull: false },
    },
    {
      sequelize,
      tableName: "order_approved",
      timestamps: true,
      indexes: [
        //get
        { fields: ["approvedBy"] },
      ],
    },
  );

  return OrderApproved;
}
