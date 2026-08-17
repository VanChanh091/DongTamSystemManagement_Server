import { DataTypes, Model, Optional, Sequelize } from "sequelize";
import { Customer } from "./customer";

export type PaymentType = "daily" | "weekly" | "monthly" | "custom_days";

//định nghĩa trường trong bảng
interface CustomerPaymentAttributes {
  cusPaymentId: string;
  debtCurrent?: number | null;
  debtLimit?: number | null;
  paymentType: PaymentType;

  closingDays?: number[] | null;
  paymentTermDays: number;

  //FK
  customerId: string;

  createdAt?: Date;
  updatedAt?: Date;
}

//cho phép bỏ qua id khi tạo
export type CustomerPaymentCreationAttributes = Optional<
  CustomerPaymentAttributes,
  | "debtCurrent"
  | "debtLimit"
  | "debtCurrent"
  | "debtLimit"
  | "closingDays"
  | "createdAt"
  | "updatedAt"
>;

//định nghĩa kiểu OOP
export class CustomerPayment
  extends Model<CustomerPaymentAttributes, CustomerPaymentCreationAttributes>
  implements CustomerPaymentAttributes
{
  declare cusPaymentId: string;
  declare debtCurrent?: number | null;
  declare debtLimit?: number | null;
  declare paymentType: PaymentType;

  declare closingDays?: number[];
  declare paymentTermDays: number;

  //FK
  declare customerId: string;
  declare Customer: Customer;

  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;
}

export function initCustomerPaymentModel(sequelize: Sequelize): typeof CustomerPayment {
  CustomerPayment.init(
    {
      cusPaymentId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      closingDays: {
        type: DataTypes.JSON,
        defaultValue: [],
        comment: "Mảng lưu các ngày chốt nợ. VD: [15, 30] hoặc [0] cho Chủ Nhật",
      },
      paymentTermDays: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: "Số ngày được nợ thêm kể từ ngày xuất/chốt",
      },
      paymentType: {
        type: DataTypes.ENUM("daily", "weekly", "monthly", "custom_days"),
        allowNull: false,
        defaultValue: "daily",
      },
      debtCurrent: { type: DataTypes.DOUBLE, defaultValue: 0 },
      debtLimit: { type: DataTypes.DOUBLE, defaultValue: 0 },

      //FK
      customerId: { type: DataTypes.STRING, allowNull: false },
    },
    {
      sequelize,
      tableName: "CustomerPayments",
      timestamps: true,
      indexes: [{ unique: true, fields: ["customerId"] }, { fields: ["paymentType"] }],
    },
  );

  return CustomerPayment;
}
