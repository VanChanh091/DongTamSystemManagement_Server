import { DataTypes, Model, Optional, Sequelize } from "sequelize";
import { Customer } from "../customer/customer.js";
import { Product } from "../product/product.js";
import { User } from "../user/user.js";
import { Box } from "./box.js";
import { OutboundHistory } from "../warehouse/outboundHistory.js";

export type OrderStatus = "pending" | "accept" | "reject" | "planning" | "stop";

//định nghĩa trường trong bảng
interface OrderAttributes {
  orderId: string;
  dayReceiveOrder: Date;
  dateRequestShipping: Date;
  lengthPaperCustomer: number;
  lengthPaperManufacture: number;
  paperSizeCustomer: number;
  paperSizeManufacture: number;
  quantityCustomer: number;
  quantityManufacture: number;
  numberChild: number;
  acreage: number;
  dvt: string;
  price: number;
  pricePaper: number;
  totalPrice: number;
  totalPriceVAT: number;
  isBox: boolean;
  status: OrderStatus;

  flute?: string | null;
  QC_box?: string | null;
  canLan?: string | null;
  daoXa?: string | null;
  day?: string | null;
  matE?: string | null;
  matB?: string | null;
  matC?: string | null;
  matE2?: string | null;
  songE?: string | null;
  songB?: string | null;
  songC?: string | null;
  songE2?: string | null;
  discount?: number | null;
  profit?: number | null;
  vat?: number | null;
  instructSpecial?: string | null;
  rejectReason?: string | null;

  createdAt?: Date;
  updatedAt?: Date;

  //FK
  customerId: string;
  productId: string;
  userId: number;
}

//cho phép bỏ qua id khi tạo
type OrderCreationAttributes = Optional<
  OrderAttributes,
  | "dayReceiveOrder"
  | "dateRequestShipping"
  | "lengthPaperCustomer"
  | "lengthPaperManufacture"
  | "paperSizeCustomer"
  | "paperSizeManufacture"
  | "quantityCustomer"
  | "quantityManufacture"
  | "numberChild"
  | "acreage"
  | "dvt"
  | "price"
  | "pricePaper"
  | "profit"
  | "flute"
  | "QC_box"
  | "canLan"
  | "daoXa"
  | "day"
  | "matE"
  | "matB"
  | "matC"
  | "matE2"
  | "songE"
  | "songB"
  | "songC"
  | "songE2"
  | "discount"
  | "totalPrice"
  | "vat"
  | "totalPriceVAT"
  | "instructSpecial"
  | "rejectReason"
  | "isBox"
  | "status"
  | "createdAt"
  | "updatedAt"
>;

//định nghĩa kiểu OOP
export class Order
  extends Model<OrderAttributes, OrderCreationAttributes>
  implements OrderAttributes
{
  declare orderId: string;
  declare dayReceiveOrder: Date;
  declare flute?: string | null;
  declare QC_box?: string | null;
  declare canLan?: string | null;
  declare daoXa?: string | null;
  declare day?: string | null;
  declare matE?: string | null;
  declare matB?: string | null;
  declare matC?: string | null;
  declare matE2?: string | null;
  declare songE?: string | null;
  declare songB?: string | null;
  declare songC?: string | null;
  declare songE2?: string | null;
  declare lengthPaperCustomer: number;
  declare lengthPaperManufacture: number;
  declare paperSizeCustomer: number;
  declare paperSizeManufacture: number;
  declare quantityCustomer: number;
  declare quantityManufacture: number;
  declare numberChild: number;
  declare acreage: number;
  declare dvt: string;
  declare price: number;
  declare pricePaper: number;
  declare discount?: number | null;
  declare profit: number;
  declare dateRequestShipping: Date;
  declare totalPrice: number;
  declare vat?: number | null;
  declare totalPriceVAT: number;
  declare instructSpecial?: string | null;
  declare isBox: boolean;
  declare status: OrderStatus;
  declare rejectReason?: string | null;

  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;

  //FK
  declare customerId: string;
  declare productId: string;
  declare userId: number;

  declare Customer: Customer;
  declare Product: Product;
  declare box: Box;
  declare User: User;
  declare OutboundHistory: OutboundHistory[];
}

export function initOrderModel(sequelize: Sequelize): typeof Order {
  Order.init(
    {
      orderId: { type: DataTypes.STRING(14), allowNull: false, primaryKey: true },
      dayReceiveOrder: { type: DataTypes.DATE, allowNull: false },
      flute: { type: DataTypes.STRING },
      QC_box: { type: DataTypes.STRING },
      canLan: { type: DataTypes.STRING },
      daoXa: { type: DataTypes.STRING },
      day: { type: DataTypes.STRING },
      matE: { type: DataTypes.STRING },
      matB: { type: DataTypes.STRING },
      matC: { type: DataTypes.STRING },
      matE2: { type: DataTypes.STRING },
      songE: { type: DataTypes.STRING },
      songB: { type: DataTypes.STRING },
      songC: { type: DataTypes.STRING },
      songE2: { type: DataTypes.STRING },
      lengthPaperCustomer: { type: DataTypes.DOUBLE, allowNull: false },
      lengthPaperManufacture: { type: DataTypes.DOUBLE, allowNull: false },
      paperSizeCustomer: { type: DataTypes.DOUBLE, allowNull: false },
      paperSizeManufacture: { type: DataTypes.DOUBLE, allowNull: false },
      quantityCustomer: { type: DataTypes.INTEGER, allowNull: false },
      quantityManufacture: { type: DataTypes.INTEGER, allowNull: false },
      numberChild: { type: DataTypes.INTEGER, allowNull: false },
      acreage: { type: DataTypes.DOUBLE, allowNull: false },
      dvt: { type: DataTypes.STRING, allowNull: false },
      price: { type: DataTypes.DOUBLE, allowNull: false },
      pricePaper: { type: DataTypes.DOUBLE, allowNull: false },
      discount: { type: DataTypes.DOUBLE },
      profit: { type: DataTypes.DOUBLE },
      dateRequestShipping: { type: DataTypes.DATE, allowNull: false },
      totalPrice: { type: DataTypes.DOUBLE, allowNull: false },
      vat: { type: DataTypes.INTEGER },
      totalPriceVAT: { type: DataTypes.DOUBLE, allowNull: false },
      instructSpecial: { type: DataTypes.STRING },
      isBox: { type: DataTypes.BOOLEAN, defaultValue: false, allowNull: false },
      status: {
        type: DataTypes.ENUM("pending", "accept", "reject", "planning", "stop"),
        allowNull: false,
        defaultValue: "pending",
      },
      rejectReason: { type: DataTypes.STRING },

      //FK
      customerId: { type: DataTypes.STRING },
      productId: { type: DataTypes.STRING },
      userId: { type: DataTypes.INTEGER },
    },
    { sequelize, tableName: "Orders", timestamps: true }
  );

  return Order;
}
