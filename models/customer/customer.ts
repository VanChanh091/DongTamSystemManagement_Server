import { DataTypes, Model, Optional, Sequelize } from "sequelize";
import { CustomerPayment } from "./customerPayment";
import { meiliClient } from "../../assest/configs/connect/melisearch.config";

//định nghĩa trường trong bảng
interface CustomerAttributes {
  customerId: string;
  customerName: string;
  companyName: string;
  companyAddress: string;
  shippingAddress: string;
  customerSource: string;
  customerSeq: number;
  cskh: string;

  distance?: number | null;
  mst?: string | null;
  phone?: string | null;
  contactPerson?: string | null;
  dayCreated?: Date | null;
  rateCustomer?: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

//cho phép bỏ qua id khi tạo
export type CustomerCreationAttributes = Optional<
  CustomerAttributes,
  | "distance"
  | "mst"
  | "phone"
  | "contactPerson"
  | "dayCreated"
  | "rateCustomer"
  | "createdAt"
  | "updatedAt"
>;

//định nghĩa kiểu OOP
export class Customer
  extends Model<CustomerAttributes, CustomerCreationAttributes>
  implements CustomerAttributes
{
  declare customerId: string;
  declare customerName: string;
  declare companyName: string;
  declare companyAddress: string;
  declare shippingAddress: string;
  declare distance?: number | null;
  declare mst?: string | null;
  declare phone?: string | null;
  declare contactPerson?: string | null;
  declare dayCreated?: Date | null;
  declare rateCustomer?: string | null;
  declare customerSource: string;
  declare cskh: string;
  declare customerSeq: number;

  //association
  declare payment?: CustomerPayment;

  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;
}

export function initCustomerModel(sequelize: Sequelize): typeof Customer {
  Customer.init(
    {
      customerId: {
        type: DataTypes.STRING(14),
        allowNull: false,
        primaryKey: true,
      },
      customerName: { type: DataTypes.STRING, allowNull: false },
      companyName: { type: DataTypes.STRING, allowNull: false },
      companyAddress: { type: DataTypes.STRING, allowNull: false },
      shippingAddress: { type: DataTypes.STRING, allowNull: false },
      distance: { type: DataTypes.DOUBLE },
      mst: { type: DataTypes.STRING },
      phone: { type: DataTypes.STRING },
      contactPerson: { type: DataTypes.STRING },
      dayCreated: { type: DataTypes.DATE },
      rateCustomer: { type: DataTypes.STRING },
      customerSource: { type: DataTypes.STRING, allowNull: false },
      cskh: { type: DataTypes.STRING, allowNull: false },
      customerSeq: { type: DataTypes.INTEGER, allowNull: false },
    },
    {
      sequelize,
      tableName: "Customers",
      timestamps: true,
      indexes: [
        //get
        { fields: ["customerSeq"] },
      ],
    },
  );

  return Customer;
}
