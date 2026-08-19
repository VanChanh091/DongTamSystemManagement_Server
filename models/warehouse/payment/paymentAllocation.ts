import { DataTypes, Model, Optional, Sequelize } from "sequelize";
import { OutboundHistory } from "../outbound/outboundHistory";

export type PaymentMethodType = "IMPORT" | "MANUAL";

//định nghĩa trường trong bảng
interface PaymentAllocationAttributes {
  allocationId: number;
  amountAllocation: number;
  paymentMethod: PaymentMethodType;

  //FK
  outboundId: number;

  createdAt?: Date;
  updatedAt?: Date;
}

//cho phép bỏ qua id khi tạo
export type PaymentAllocationCreationAttributes = Optional<
  PaymentAllocationAttributes,
  "allocationId" | "outboundId" | "paymentMethod" | "createdAt" | "updatedAt"
>;

//định nghĩa kiểu OOP
export class PaymentAllocation //Phiếu phân bổ thanh toán của khách hàng
  extends Model<PaymentAllocationAttributes, PaymentAllocationCreationAttributes>
  implements PaymentAllocationAttributes
{
  declare allocationId: number;
  declare amountAllocation: number;
  declare paymentMethod: PaymentMethodType;

  //FK
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
      paymentMethod: { type: DataTypes.STRING, allowNull: false, defaultValue: "MANUAL" },

      //FK
      outboundId: { type: DataTypes.INTEGER, allowNull: false },
    },
    {
      sequelize,
      tableName: "payment_allocations",
      timestamps: true,
      indexes: [{ fields: ["outboundId"] }],
    },
  );

  return PaymentAllocation;
}
