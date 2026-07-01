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
  outboundBy: string;
  updatedBy?: string;
  status: statusOutbound;

  createdAt?: Date;
  updatedAt?: Date;
}

//cho phép bỏ qua id khi tạo
export type OutboundHistoryCreationAttributes = Optional<
  OutboundHistoryAttributes,
  "outboundId" | "outboundBy" | "updatedBy" | "createdAt" | "updatedAt"
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
  declare outboundBy: string;
  declare updatedBy?: string;
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
      dateOutbound: {
        type: DataTypes.DATE,
        allowNull: false,
        get() {
          const rawValue = this.getDataValue("dateOutbound");
          if (!rawValue) return null;
          return new Date(rawValue.getTime() - rawValue.getTimezoneOffset() * 60000).toISOString();
        },
      },
      outboundSlipCode: { type: DataTypes.STRING, allowNull: false, unique: true },
      totalPriceOrder: { type: DataTypes.DOUBLE, allowNull: false },
      totalPriceVAT: { type: DataTypes.DOUBLE },
      totalPricePayment: { type: DataTypes.DOUBLE, allowNull: false },
      totalOutboundQty: { type: DataTypes.INTEGER, allowNull: false },
      dueDate: { type: DataTypes.DATE }, //thời hạn thanh toán PXKi
      paidAmount: { type: DataTypes.DOUBLE }, //số tiền đã thanh toán
      remainingAmount: { type: DataTypes.DOUBLE }, //số tiền còn lại phải thanh toán
      outboundBy: { type: DataTypes.STRING, allowNull: false },
      updatedBy: { type: DataTypes.STRING },
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
        { fields: ["outboundSlipCode"] },
      ],
    },
  );

  return OutboundHistory;
}
