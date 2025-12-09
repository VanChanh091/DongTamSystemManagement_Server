import { DataTypes, Model, Optional, Sequelize } from "sequelize";
import { Order } from "../order/order";

//định nghĩa trường trong bảng
interface InboundHistoryAttributes {
  inboundId: number;
  dateInbound: Date;
  qtyPaper: number;
  qtyInbound: number;
  createdAt?: Date;
  updatedAt?: Date;

  //FK
  orderId: string;
}

//cho phép bỏ qua id khi tạo
type InboundHistoryCreationAttributes = Optional<
  InboundHistoryAttributes,
  "inboundId" | "createdAt" | "updatedAt"
>;

//định nghĩa kiểu OOP
export class InboundHistory
  extends Model<InboundHistoryAttributes, InboundHistoryCreationAttributes>
  implements InboundHistoryAttributes
{
  declare inboundId: number;
  declare dateInbound: Date;
  declare qtyPaper: number;
  declare qtyInbound: number;
  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;

  //FK
  declare orderId: string;
  declare Order: Order;
}

export function initInboundHistoryModel(sequelize: Sequelize): typeof InboundHistory {
  InboundHistory.init(
    {
      inboundId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      dateInbound: { type: DataTypes.DATE, allowNull: false },
      qtyPaper: { type: DataTypes.INTEGER, allowNull: false },
      qtyInbound: { type: DataTypes.INTEGER, allowNull: false },

      //FK
      orderId: { type: DataTypes.STRING, allowNull: false },
    },
    { sequelize, tableName: "InboundHistory", timestamps: true }
  );

  return InboundHistory;
}
