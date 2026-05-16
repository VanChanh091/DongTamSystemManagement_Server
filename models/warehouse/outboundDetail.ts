import { DataTypes, Model, Optional, Sequelize } from "sequelize";
import { Order } from "../order/order";
import { OutboundHistory } from "./outboundHistory";
import { DeliveryItem } from "../delivery/deliveryItem";

//định nghĩa trường trong bảng
interface OutboundDetailAttributes {
  outboundDetailId: number;
  outboundQty: number;
  price: number;
  totalPriceOutbound: number;
  deliveredQty: number;
  createdAt?: Date;
  updatedAt?: Date;

  //FK
  orderId: string;
  outboundId: number;
  deliveryItemId?: number;
}

//cho phép bỏ qua id khi tạo
export type OutboundDetailCreationAttributes = Optional<
  OutboundDetailAttributes,
  "outboundDetailId" | "createdAt" | "updatedAt"
>;

//định nghĩa kiểu OOP
export class OutboundDetail
  extends Model<OutboundDetailAttributes, OutboundDetailCreationAttributes>
  implements OutboundDetailAttributes
{
  declare outboundDetailId: number;
  declare outboundQty: number;
  declare price: number;
  declare totalPriceOutbound: number;
  declare deliveredQty: number;

  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;

  //FK
  declare orderId: string;
  declare Order: Order;

  declare outboundId: number;
  declare outbound: OutboundHistory;

  declare deliveryItemId?: number;
  declare DeliveryItem: DeliveryItem;
}

export function initOutboundDetailModel(sequelize: Sequelize): typeof OutboundDetail {
  OutboundDetail.init(
    {
      outboundDetailId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      outboundQty: { type: DataTypes.INTEGER, allowNull: false },
      price: { type: DataTypes.DOUBLE, allowNull: false },
      totalPriceOutbound: { type: DataTypes.DOUBLE, allowNull: false },
      deliveredQty: { type: DataTypes.INTEGER, allowNull: false },

      //FK
      orderId: { type: DataTypes.STRING, allowNull: false },
      outboundId: { type: DataTypes.INTEGER, allowNull: false },
      deliveryItemId: { type: DataTypes.INTEGER },
    },
    {
      sequelize,
      tableName: "OutboundDetail",
      timestamps: true,
      indexes: [
        //FK
        { fields: ["orderId"] },
        { fields: ["outboundId"] },
        { fields: ["deliveryItemId"] },

        //indexes
        { fields: ["orderId", "outboundId"] },
      ],
    },
  );

  return OutboundDetail;
}
