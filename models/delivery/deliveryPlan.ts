import { DataTypes, Model, Optional, Sequelize } from "sequelize";
import { DeliveryItem } from "./deliveryItem";

export type statusDelivery = "none" | "planned" | "cancelled" | "completed";

//định nghĩa trường trong bảng
interface DeliveryPlanAttributes {
  deliveryId: number;
  deliveryDate?: Date | null;
  status: statusDelivery;

  createdAt?: Date;
  updatedAt?: Date;
}

//cho phép bỏ qua id khi tạo
export type DeliveryPlanCreationAttributes = Optional<
  DeliveryPlanAttributes,
  "deliveryId" | "status" | "createdAt" | "updatedAt"
>;

//định nghĩa kiểu OOP
export class DeliveryPlan
  extends Model<DeliveryPlanAttributes, DeliveryPlanCreationAttributes>
  implements DeliveryPlanAttributes
{
  declare deliveryId: number;
  declare deliveryDate?: Date | null;
  declare status: statusDelivery;

  //ASSOCIATION
  declare DeliveryItems?: DeliveryItem[];

  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;
}

export function initDeliveryPlanModel(sequelize: Sequelize): typeof DeliveryPlan {
  DeliveryPlan.init(
    {
      deliveryId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      deliveryDate: { type: DataTypes.DATE, unique: true },
      status: {
        type: DataTypes.ENUM("none", "planned", "cancelled", "completed"),
        allowNull: false,
        defaultValue: "none",
      },
    },
    {
      sequelize,
      tableName: "DeliveryPlan",
      timestamps: true,
      indexes: [{ fields: ["deliveryDate"] }],
    }
  );

  return DeliveryPlan;
}
