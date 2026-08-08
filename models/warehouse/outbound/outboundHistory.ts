import { DataTypes, Model, Optional, Sequelize } from "sequelize";
import { OutboundDetail } from "./outboundDetail";
import { Customer } from "../../customer/customer";

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

  paidAmount?: number;
  remainingAmount?: number;

  outboundBy: string;
  updatedBy?: string;

  dueDate?: Date | null;
  status: statusOutbound;

  writeOffAmount?: number;
  writeOffNote?: string;

  //FK
  customerId: string;

  createdAt?: Date;
  updatedAt?: Date;
}

//cho phép bỏ qua id khi tạo
export type OutboundHistoryCreationAttributes = Optional<
  OutboundHistoryAttributes,
  "outboundId" | "customerId" | "outboundBy" | "updatedBy" | "createdAt" | "updatedAt"
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

  declare paidAmount?: number;
  declare remainingAmount?: number;

  declare outboundBy: string;
  declare updatedBy?: string;

  declare dueDate?: Date | null;
  declare status: statusOutbound;

  declare writeOffAmount?: number;
  declare writeOffNote?: string;

  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;

  //association
  declare detail: OutboundDetail[];

  declare customerId: string;
  declare Customer: Customer;
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
      dueDate: { type: DataTypes.DATE, comment: "Thời hạn thanh toán PXK" },
      paidAmount: { type: DataTypes.DOUBLE, comment: "Số tiền đã thanh toán" },
      remainingAmount: { type: DataTypes.DOUBLE, comment: "Số tiền còn lại phải thanh toán" },
      outboundBy: { type: DataTypes.STRING, allowNull: false },
      updatedBy: { type: DataTypes.STRING },
      status: {
        type: DataTypes.ENUM("paid", "unpaid", "partial"),
        defaultValue: "unpaid",
        allowNull: false,
      },
      writeOffAmount: { type: DataTypes.DOUBLE, comment: "Số tiền đã xóa nợ" },
      writeOffNote: { type: DataTypes.STRING, comment: "Ghi chú xóa nợ" },

      //FK
      customerId: { type: DataTypes.STRING, allowNull: true },
    },
    {
      sequelize,
      tableName: "OutboundHistory",
      timestamps: true,
      indexes: [
        //indexes
        { fields: ["dateOutbound"] },
        { fields: ["outboundSlipCode"] },

        //composite indexes
        { fields: ["customerId", "status", "outboundSlipCode"] },
        {
          //index phục vụ cho việc tìm các KH chưa chốt công nợ
          name: "idx_outbound_unpaid_summary",
          fields: ["customerId", "dueDate", "status", "dateOutbound", "remainingAmount"],
        },
        {
          //index phục vụ cho việc tìm các PXK chưa thanh toán
          name: "idx_outbound_debt_summary",
          fields: ["status", "customerId", "remainingAmount", "dateOutbound"],
        },
      ],
    },
  );

  return OutboundHistory;
}
