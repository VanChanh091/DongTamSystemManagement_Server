import { DataTypes, Model, Optional, Sequelize } from "sequelize";
import { DeliveryPlan } from "./deliveryPlan";
import { Vehicle } from "../admin/vehicle";
import { PlanningBox } from "../planning/planningBox";
import { PlanningPaper } from "../planning/planningPaper";

export type statusDeliveryItem = "none" | "planned" | "cancelled" | "completed";
export type targetType = "paper" | "box";

//định nghĩa trường trong bảng
interface DeliveryItemAttributes {
  deliveryItemId: number;
  targetType: targetType;
  targetId: number; //planningPaper or planningBox
  sequence: number;
  status: statusDeliveryItem;

  //FK
  deliveryId: number;
  vehicleId: number;

  createdAt?: Date;
  updatedAt?: Date;
}

//cho phép bỏ qua id khi tạo
export type DeliveryItemCreationAttributes = Optional<
  DeliveryItemAttributes,
  "deliveryItemId" | "status" | "createdAt" | "updatedAt"
>;

//định nghĩa kiểu OOP
export class DeliveryItem
  extends Model<DeliveryItemAttributes, DeliveryItemCreationAttributes>
  implements DeliveryItemAttributes
{
  declare deliveryItemId: number;
  declare targetType: targetType;
  declare targetId: number;
  declare sequence: number;
  declare status: statusDeliveryItem;

  //FK
  declare deliveryId: number;
  declare vehicleId: number;

  declare DeliveryPlan: DeliveryPlan;
  declare Vehicle: Vehicle;

  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;
}

export function initDeliveryItemModel(sequelize: Sequelize): typeof DeliveryItem {
  DeliveryItem.init(
    {
      deliveryItemId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      targetType: { type: DataTypes.STRING, allowNull: false },
      targetId: { type: DataTypes.INTEGER, allowNull: false },
      sequence: { type: DataTypes.INTEGER, allowNull: false },
      status: {
        type: DataTypes.ENUM("none", "planned", "cancelled", "completed"),
        allowNull: false,
        defaultValue: "none",
      },

      //FK
      deliveryId: { type: DataTypes.INTEGER, allowNull: false },
      vehicleId: { type: DataTypes.INTEGER, allowNull: false },
    },
    { sequelize, tableName: "DeliveryItem", timestamps: true }
  );

  return DeliveryItem;
}
