import { DataTypes, Model, Optional, Sequelize } from "sequelize";
import { PlanningPaper } from "../planning/planningPaper";
import { User } from "../user/user";

export type statusDelivery = "requested" | "scheduled" | "cancelled";

//định nghĩa trường trong bảng
interface DeliveryRequestAttributes {
  requestId: number;
  status: statusDelivery;

  //FK
  userId: number;
  planningId: number;

  createdAt?: Date;
  updatedAt?: Date;
}

//cho phép bỏ qua id khi tạo
export type DeliveryRequestCreationAttributes = Optional<
  DeliveryRequestAttributes,
  "requestId" | "status" | "createdAt" | "updatedAt"
>;

//định nghĩa kiểu OOP
export class DeliveryRequest
  extends Model<DeliveryRequestAttributes, DeliveryRequestCreationAttributes>
  implements DeliveryRequestAttributes
{
  declare requestId: number;
  declare status: statusDelivery;

  //ASSOCIATION
  declare planningId: number;
  declare PlanningPaper: PlanningPaper;

  declare userId: number;
  declare User: User;

  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;
}

export function initDeliveryRequestModel(sequelize: Sequelize): typeof DeliveryRequest {
  DeliveryRequest.init(
    {
      requestId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      status: {
        type: DataTypes.ENUM("requested", "scheduled", "cancelled"),
        allowNull: false,
        defaultValue: "requested",
      },

      //FK
      userId: { type: DataTypes.INTEGER, allowNull: false },
      planningId: { type: DataTypes.INTEGER, allowNull: false },
    },
    {
      sequelize,
      tableName: "DeliveryRequest",
      timestamps: true,
    },
  );

  return DeliveryRequest;
}
