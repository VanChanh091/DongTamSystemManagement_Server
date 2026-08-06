import { DataTypes, Model, Optional, Sequelize } from "sequelize";
import { Customer } from "../../customer/customer";
import { PaymentAllocation } from "./paymentAllocation";

export type SourcePaymentType = "IMPORT" | "MANUAL";

//định nghĩa trường trong bảng
interface PaymentReceiptAttributes {
  receiptId: number;
  amountPayment: number;
  paymentDate: Date;
  sourcePayment: SourcePaymentType;

  //FK
  customerId: string;

  createdAt?: Date;
  updatedAt?: Date;
}

//cho phép bỏ qua id khi tạo
export type PaymentReceiptCreationAttributes = Optional<
  PaymentReceiptAttributes,
  "receiptId" | "customerId" | "sourcePayment" | "createdAt" | "updatedAt"
>;

//định nghĩa kiểu OOP
export class PaymentReceipt //Phiếu thanh toán của khách hàng
  extends Model<PaymentReceiptAttributes, PaymentReceiptCreationAttributes>
  implements PaymentReceiptAttributes
{
  declare receiptId: number;
  declare amountPayment: number;
  declare paymentDate: Date;
  declare sourcePayment: SourcePaymentType;

  //FK
  declare customerId: string;
  declare Customer: Customer;
  declare allocations?: PaymentAllocation[];

  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;
}

export function initPaymentReceiptModel(sequelize: Sequelize): typeof PaymentReceipt {
  PaymentReceipt.init(
    {
      receiptId: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      amountPayment: { type: DataTypes.DOUBLE, allowNull: false },
      paymentDate: { type: DataTypes.DATE, allowNull: false },
      sourcePayment: {
        type: DataTypes.ENUM("IMPORT", "MANUAL"),
        allowNull: false,
        defaultValue: "MANUAL",
      },

      //FK
      customerId: { type: DataTypes.STRING, allowNull: false },
    },
    {
      sequelize,
      tableName: "PaymentReceipt",
      timestamps: true,
      indexes: [
        { fields: ["customerId"] },
        { fields: ["paymentDate"] },
        { fields: ["customerId", "paymentDate"] },
      ],
    },
  );

  return PaymentReceipt;
}
