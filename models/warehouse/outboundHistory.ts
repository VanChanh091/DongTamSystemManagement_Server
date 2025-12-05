import { DataTypes, Model, Optional, Sequelize } from "sequelize";
import { Order } from "../order/order";

//định nghĩa trường trong bảng
interface OutboundHistoryAttributes {
  outboundId: number;
  dateOutbound: Date;
  outboundSlipCode: string;
  deliveredQty: number;
  outboundQty: number;
  createdAt?: Date;
  updatedAt?: Date;

  //FK
  orderId: string;
}

//cho phép bỏ qua id khi tạo
type OutboundHistoryCreationAttributes = Optional<
  OutboundHistoryAttributes,
  "outboundId" | "createdAt" | "updatedAt"
>;

//định nghĩa kiểu OOP
export class OutboundHistory
  extends Model<OutboundHistoryAttributes, OutboundHistoryCreationAttributes>
  implements OutboundHistoryAttributes
{
  declare outboundId: number;
  declare dateOutbound: Date;
  declare outboundSlipCode: string;
  declare deliveredQty: number;
  declare outboundQty: number;
  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;

  //FK
  declare orderId: string;
  declare Order: Order;
}

export function initOutboundHistoryModel(sequelize: Sequelize): typeof OutboundHistory {
  OutboundHistory.init(
    {
      outboundId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      dateOutbound: { type: DataTypes.DATE, allowNull: false },
      outboundSlipCode: { type: DataTypes.STRING, allowNull: false },
      deliveredQty: { type: DataTypes.INTEGER, allowNull: false },
      outboundQty: { type: DataTypes.INTEGER, allowNull: false },

      //FK
      orderId: { type: DataTypes.STRING, allowNull: false },
    },
    { sequelize, tableName: "OutboundHistory", timestamps: true }
  );

  return OutboundHistory;
}
