import { DataTypes, Model, Optional, Sequelize } from "sequelize";
import { OutboundDetail } from "./outboundDetail";

export type statusOutbound = "paid" | "unpaid" | "partial";

//định nghĩa trường trong bảng
interface OutboundHistoryAttributes {
  outboundId: number;
  dateOutbound: Date;
  outboundSlipCode: string;
  totalPriceOrder: number;
  totalPriceVAT?: number;
  totalPricePayment: number;
  totalOutboundQty: number;
  dueDate?: Date | null;
  paidAmount?: number;
  remainingAmount?: number;
  status: statusOutbound;

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
  declare dueDate?: Date | null;
  declare paidAmount?: number;
  declare remainingAmount?: number;
  declare status: statusOutbound;

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
      dueDate: { type: DataTypes.DATE }, //thời hạn thanh toán PXK
      paidAmount: { type: DataTypes.DOUBLE }, //số tiền đã thanh toán
      remainingAmount: { type: DataTypes.DOUBLE }, //số tiền còn lại phải thanh toán
      status: {
        type: DataTypes.ENUM("paid", "unpaid", "partial"),
        defaultValue: "unpaid",
        allowNull: false,
      },
    },
    {
      sequelize,
      tableName: "OutboundHistory",
      timestamps: true,
      indexes: [
        //indexes
        { fields: ["dateOutbound"] },
      ],
    },
  );

  return OutboundHistory;
}
