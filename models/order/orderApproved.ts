import { DataTypes, Model, Optional, Sequelize } from "sequelize";

export type statusScrap = "pending" | "confirmed" | "allocated" | "rejected";

//định nghĩa trường trong bảng
interface OrderApprovedAttributes {
  approverId: number;
  approvedBy: string;

  //FK
  orderId: string;

  createdAt?: Date;
  updatedAt?: Date;
}

//cho phép bỏ qua id khi tạo
export type OrderApprovedCreationAttributes = Optional<
  OrderApprovedAttributes,
  "approverId" | "createdAt" | "updatedAt"
>;

//định nghĩa kiểu OOP
export class OrderApproved
  extends Model<OrderApprovedAttributes, OrderApprovedCreationAttributes>
  implements OrderApprovedAttributes
{
  declare approverId: number;
  declare approvedBy: string;

  //FK
  declare orderId: string;

  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;
}

export function initOrderApprovedModel(sequelize: Sequelize): typeof OrderApproved {
  OrderApproved.init(
    {
      approverId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      approvedBy: { type: DataTypes.STRING, allowNull: false },

      //FK
      orderId: { type: DataTypes.STRING, allowNull: false },
    },
    {
      sequelize,
      tableName: "OrderApproved",
      timestamps: true,
      indexes: [
        //get
        { fields: ["approvedBy"] },
      ],
    },
  );

  return OrderApproved;
}
