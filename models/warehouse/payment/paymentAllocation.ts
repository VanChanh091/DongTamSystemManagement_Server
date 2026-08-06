import { DataTypes, Model, Optional, Sequelize } from "sequelize";
import { PaymentReceipt } from "./paymentReceipt";
import { OutboundHistory } from "../outbound/outboundHistory";

//định nghĩa trường trong bảng
interface PaymentAllocationAttributes {
  allocationId: number;
  amountAllocation: number;

  //FK
  receiptId: number;
  outboundId: number;

  createdAt?: Date;
  updatedAt?: Date;
}

//cho phép bỏ qua id khi tạo
export type PaymentAllocationCreationAttributes = Optional<
  PaymentAllocationAttributes,
  "allocationId" | "receiptId" | "outboundId" | "createdAt" | "updatedAt"
>;

//định nghĩa kiểu OOP
export class PaymentAllocation //Phiếu phân bổ thanh toán của khách hàng
  extends Model<PaymentAllocationAttributes, PaymentAllocationCreationAttributes>
  implements PaymentAllocationAttributes
{
  declare allocationId: number;
  declare amountAllocation: number;

  //FK
  declare receiptId: number;
  declare receipt: PaymentReceipt;

  declare outboundId: number;
  declare outbound: OutboundHistory;

  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;
}

export function initPaymentAllocationModel(sequelize: Sequelize): typeof PaymentAllocation {
  PaymentAllocation.init(
    {
      allocationId: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      amountAllocation: { type: DataTypes.DOUBLE, allowNull: false },

      //FK
      receiptId: { type: DataTypes.INTEGER, allowNull: false },
      outboundId: { type: DataTypes.INTEGER, allowNull: false },
    },
    {
      sequelize,
      tableName: "PaymentAllocation",
      timestamps: true,
      indexes: [{ fields: ["receiptId"] }, { fields: ["outboundId"] }],
    },
  );

  return PaymentAllocation;
}
