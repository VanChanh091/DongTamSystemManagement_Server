import { DataTypes, Model, Optional, Sequelize } from "sequelize";
import { Order } from "../order/order";
import { OutboundDetail } from "./outboundDetail";

//định nghĩa trường trong bảng
interface OutboundHistoryAttributes {
  outboundId: number;
  dateOutbound: Date;
  outboundSlipCode: string;
  totalPriceOrder: number;
  totalVAT?: number;
  totalPricePayment: number;
  totalOutboundQty: number;
  totalDeliveredQty: number;
  createdAt?: Date;
  updatedAt?: Date;
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
  declare totalPriceOrder: number;
  declare totalVAT?: number;
  declare totalPricePayment: number;
  declare totalOutboundQty: number;
  declare totalDeliveredQty: number;
  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;

  //association
  declare outboundDetail: OutboundDetail;
}

export function initOutboundHistoryModel(sequelize: Sequelize): typeof OutboundHistory {
  OutboundHistory.init(
    {
      outboundId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      dateOutbound: { type: DataTypes.DATE, allowNull: false },
      outboundSlipCode: { type: DataTypes.STRING, allowNull: false },
      totalPriceOrder: { type: DataTypes.DOUBLE, allowNull: false },
      totalVAT: { type: DataTypes.DOUBLE },
      totalPricePayment: { type: DataTypes.DOUBLE, allowNull: false },
      totalOutboundQty: { type: DataTypes.INTEGER, allowNull: false },
      totalDeliveredQty: { type: DataTypes.INTEGER, allowNull: false },
    },
    { sequelize, tableName: "OutboundHistory", timestamps: true }
  );

  return OutboundHistory;
}
