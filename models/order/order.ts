import { DataTypes, Model, Optional, Sequelize } from "sequelize";
import { Customer } from "../customer/customer.js";
import { Product } from "../product/product.js";
import { User } from "../user/user.js";
import { Box } from "./box.js";
import { OutboundHistory } from "../warehouse/outboundHistory.js";
import { Inventory } from "../warehouse/inventory/inventory.js";

export type OrderStatus = "pending" | "accept" | "reject" | "planning" | "stop" | "completed";

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
  volume: number;
  status: OrderStatus;
  statusPriority: number;

  isBox: boolean;
  chongTham: boolean;

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
  orderIdCustomer?: string | null;
  note?: string | null;

  orderSortValue: number;

  createdAt?: Date;
  updatedAt?: Date;

  //association
  customerId: string;
  productId: string;
  userId: number;
}

//cho phép bỏ qua id khi tạo
export type OrderCreationAttributes = Optional<
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
  | "volume"
  | "isBox"
  | "chongTham"
  | "status"
  | "statusPriority"
  | "orderIdCustomer"
  | "note"
  | "orderSortValue"
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
  declare profit: number;
  declare dateRequestShipping: Date;
  declare totalPrice: number;
  declare totalPriceVAT: number;
  declare volume: number;
  declare status: OrderStatus;

  declare isBox: boolean;
  declare chongTham: boolean;

  declare statusPriority: number;
  declare orderSortValue: number;

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
  declare discount?: number | null;
  declare vat?: number | null;
  declare instructSpecial?: string | null;
  declare rejectReason?: string | null;
  declare orderIdCustomer?: string | null;
  declare note?: string | null;

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
  declare Inventories: Inventory;
}

export function initOrderModel(sequelize: Sequelize): typeof Order {
  const priorityMap: Record<string, number> = {
    pending: 1,
    accept: 2,
    reject: 3,
    planning: 4,
    stop: 5,
    completed: 6,
  };

  Order.init(
    {
      orderId: { type: DataTypes.STRING(15), allowNull: false, primaryKey: true },
      dayReceiveOrder: { type: DataTypes.DATE, allowNull: false },
      dateRequestShipping: { type: DataTypes.DATE, allowNull: false },
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
      totalPrice: { type: DataTypes.DOUBLE, allowNull: false },
      vat: { type: DataTypes.INTEGER },
      totalPriceVAT: { type: DataTypes.DOUBLE, allowNull: false },
      volume: { type: DataTypes.DOUBLE, allowNull: false },
      instructSpecial: { type: DataTypes.STRING },
      isBox: { type: DataTypes.BOOLEAN, defaultValue: false, allowNull: false },
      chongTham: { type: DataTypes.BOOLEAN, defaultValue: false, allowNull: false },
      status: {
        type: DataTypes.ENUM("pending", "accept", "reject", "planning", "stop", "completed"), //1-2-3-4-5-6
        allowNull: false,
        defaultValue: "pending",
      },
      rejectReason: { type: DataTypes.STRING },
      orderIdCustomer: { type: DataTypes.STRING }, //PO khach hang cung cap
      note: { type: DataTypes.STRING },

      //sort
      orderSortValue: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
      statusPriority: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },

      //FK
      customerId: { type: DataTypes.STRING },
      productId: { type: DataTypes.STRING },
      userId: { type: DataTypes.INTEGER },
    },
    {
      sequelize,
      tableName: "Orders",
      timestamps: true,
      hooks: {
        beforeSave: (order: any) => {
          if (order.changed("status")) {
            order.statusPriority = priorityMap[order.status] || 1;
          }

          if (order.changed("orderId") && order.orderId) {
            const parts = order.orderId.split("/"); // Ví dụ: [1234, 11, 25, D001]

            if (parts.length >= 4) {
              const po = parseInt(parts[0], 10) || 0;
              const month = parseInt(parts[1], 10) || 0;
              const year = parseInt(parts[2], 10) || 0;
              const suffix = parseInt(parts[3].replace(/\D/g, ""), 10) || 0; // Tách số từ hậu tố "D002" -> 002

              // Công thức: Value = (Year * 10^11) + (Month * 10^9) + (PO * 10^4) + Suffix
              order.orderSortValue = year * 100000000000 + month * 1000000000 + po * 10000 + suffix;
            }
          }
        },
      },
      indexes: [
        //FK
        { fields: ["customerId"] },
        { fields: ["productId"] },
        { fields: ["userId"] },

        //other field
        { fields: ["status"] },
        { fields: ["createdAt"] },
        { fields: ["orderSortValue"] },

        //sort
        { fields: ["statusPriority", "orderSortValue"] },
      ],
    },
  );

  return Order;
}
