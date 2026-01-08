import { DataTypes, Model, Optional, Sequelize } from "sequelize";
import { OutboundDetail } from "./outboundDetail";

//định nghĩa trường trong bảng
interface OutboundHistoryAttributes {
  outboundId: number;
  dateOutbound: Date;
  outboundSlipCode: string;
  totalPriceOrder: number;
  totalPriceVAT?: number;
  totalPricePayment: number;
  totalOutboundQty: number;
  createdAt?: Date;
  updatedAt?: Date;
}

//cho phép bỏ qua id khi tạo
export type OutboundHistoryCreationAttributes = Optional<
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
  declare totalPriceVAT?: number;
  declare totalPricePayment: number;
  declare totalOutboundQty: number;
  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;

  //association
  declare detail: OutboundDetail[];
}

export function initOutboundHistoryModel(sequelize: Sequelize): typeof OutboundHistory {
  OutboundHistory.init(
    {
      outboundId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      dateOutbound: { type: DataTypes.DATE, allowNull: false },
      outboundSlipCode: { type: DataTypes.STRING, allowNull: false },
      totalPriceOrder: { type: DataTypes.DOUBLE, allowNull: false },
      totalPriceVAT: { type: DataTypes.DOUBLE },
      totalPricePayment: { type: DataTypes.DOUBLE, allowNull: false },
      totalOutboundQty: { type: DataTypes.INTEGER, allowNull: false },
    },
    { sequelize, tableName: "OutboundHistory", timestamps: true }
  );

  return OutboundHistory;
}
