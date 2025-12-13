import { DataTypes, Model, Optional, Sequelize } from "sequelize";
import { Order } from "../order/order";
import { OutboundHistory } from "./outboundHistory";

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
}

//cho phép bỏ qua id khi tạo
type OutboundDetailCreationAttributes = Optional<
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
    },
    { sequelize, tableName: "OutboundDetail", timestamps: true }
  );

  return OutboundDetail;
}
