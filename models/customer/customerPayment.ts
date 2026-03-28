import { DataTypes, Model, Optional, Sequelize } from "sequelize";
import { Customer } from "./customer";

export type paymentType = "daily" | "monthly";

//định nghĩa trường trong bảng
interface CustomerPaymentAttributes {
  cusPaymentId: string;
  debtCurrent?: number | null;
  debtLimit?: number | null;
  timePayment?: Date | null;
  paymentType: paymentType;
  closingDate: number;

  //FK
  customerId: string;

  createdAt?: Date;
  updatedAt?: Date;
}

//cho phép bỏ qua id khi tạo
export type CustomerPaymentCreationAttributes = Optional<
  CustomerPaymentAttributes,
  "debtCurrent" | "debtLimit" | "timePayment" | "closingDate" | "createdAt" | "updatedAt"
>;

//định nghĩa kiểu OOP
export class CustomerPayment
  extends Model<CustomerPaymentAttributes, CustomerPaymentCreationAttributes>
  implements CustomerPaymentAttributes
{
  declare cusPaymentId: string;
  declare debtCurrent?: number | null;
  declare debtLimit?: number | null;
  declare timePayment?: Date | null;
  declare paymentType: paymentType;
  declare closingDate: number;

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
      debtCurrent: { type: DataTypes.DOUBLE },
      debtLimit: { type: DataTypes.DOUBLE },
      timePayment: { type: DataTypes.DATE },
      paymentType: { type: DataTypes.ENUM("daily", "monthly"), allowNull: false },
      closingDate: { type: DataTypes.INTEGER, allowNull: false },

      //FK
      customerId: { type: DataTypes.STRING, allowNull: false },
    },
    {
      sequelize,
      tableName: "CustomerPayments",
      timestamps: true,
      indexes: [
        { unique: true, fields: ["customerId"] },
        { fields: ["paymentType"] },
        { fields: ["closingDate"] },
      ],
    },
  );

  return CustomerPayment;
}
