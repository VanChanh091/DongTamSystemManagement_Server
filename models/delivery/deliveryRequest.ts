import { DataTypes, Model, Optional, Sequelize } from "sequelize";
import { PlanningPaper } from "../planning/planningPaper";
import { User } from "../user/user";
import { Order } from "../order/order";

export type statusDelivery = "requested" | "partial" | "scheduled" | "cancelled";

//định nghĩa trường trong bảng
interface DeliveryRequestAttributes {
  requestId: number;
  qtyRegistered: number;
  volume: number;
  qtyAllocated?: number;
  volumeAllocated?: number;
  note?: string;
  status: statusDelivery;

  //FK
  userId: number;
  planningId: number;
  orderId: string;

  createdAt?: Date;
  updatedAt?: Date;
}

//cho phép bỏ qua id khi tạo
export type DeliveryRequestCreationAttributes = Optional<
  DeliveryRequestAttributes,
  | "requestId"
  | "status"
  | "volume"
  | "qtyAllocated"
  | "volumeAllocated"
  | "note"
  | "userId"
  | "orderId"
  | "planningId"
  | "createdAt"
  | "updatedAt"
>;

//định nghĩa kiểu OOP
export class DeliveryRequest
  extends Model<DeliveryRequestAttributes, DeliveryRequestCreationAttributes>
  implements DeliveryRequestAttributes
{
  declare requestId: number;
  declare qtyRegistered: number;
  declare qtyAllocated?: number;
  declare volume: number;
  declare volumeAllocated?: number;
  declare note?: string;
  declare status: statusDelivery;

  //ASSOCIATION
  declare planningId: number;
  declare PlanningPaper: PlanningPaper;

  declare userId: number;
  declare User: User;

  declare orderId: string;
  declare Order: Order;

  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;
}

export function initDeliveryRequestModel(sequelize: Sequelize): typeof DeliveryRequest {
  DeliveryRequest.init(
    {
      requestId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      qtyRegistered: { type: DataTypes.INTEGER, allowNull: false },
      volume: { type: DataTypes.DOUBLE, allowNull: false },
      qtyAllocated: { type: DataTypes.INTEGER, defaultValue: 0 },
      volumeAllocated: { type: DataTypes.DOUBLE, defaultValue: 0 },
      note: { type: DataTypes.STRING },
      status: {
        type: DataTypes.ENUM("requested", "partial", "scheduled", "cancelled"),
        allowNull: false,
        defaultValue: "requested",
      },

      //FK
      userId: { type: DataTypes.INTEGER, allowNull: false },
      planningId: { type: DataTypes.INTEGER },
      orderId: { type: DataTypes.STRING },
    },
    {
      sequelize,
      tableName: "DeliveryRequest",
      timestamps: true,
      indexes: [
        //FK
        { fields: ["userId"] },
        { fields: ["planningId"] },
        { fields: ["orderId"] },

        //indexes
        { fields: ["status"] },
      ],
    },
  );

  return DeliveryRequest;
}
