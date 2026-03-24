import { DataTypes, Model, Optional, Sequelize } from "sequelize";
import { DeliveryPlan } from "./deliveryPlan";
import { Vehicle } from "../admin/vehicle";
import { DeliveryRequest } from "./deliveryRequest";

export type statusDeliveryItem =
  | "none"
  | "planned"
  | "requested"
  | "prepared"
  | "cancelled"
  | "completed";

//định nghĩa trường trong bảng
interface DeliveryItemAttributes {
  deliveryItemId: number;
  sequence: string;
  note?: string;
  status: statusDeliveryItem;

  //FK
  deliveryId: number;
  requestId: number;
  vehicleId: number;

  createdAt?: Date;
  updatedAt?: Date;
}

//cho phép bỏ qua id khi tạo
export type DeliveryItemCreationAttributes = Optional<
  DeliveryItemAttributes,
  "deliveryItemId" | "note" | "status" | "createdAt" | "updatedAt"
>;

//định nghĩa kiểu OOP
export class DeliveryItem
  extends Model<DeliveryItemAttributes, DeliveryItemCreationAttributes>
  implements DeliveryItemAttributes
{
  declare deliveryItemId: number;
  declare sequence: string;
  declare note?: string;
  declare status: statusDeliveryItem;

  //FK
  declare deliveryId: number;
  declare requestId: number;
  declare vehicleId: number;

  declare DeliveryPlan: DeliveryPlan;
  declare DeliveryRequest: DeliveryRequest;
  declare Vehicle: Vehicle;

  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;
}

export function initDeliveryItemModel(sequelize: Sequelize): typeof DeliveryItem {
  DeliveryItem.init(
    {
      deliveryItemId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      sequence: { type: DataTypes.STRING, allowNull: false },
      note: { type: DataTypes.STRING },
      status: {
        type: DataTypes.ENUM("none", "planned", "requested", "prepared", "cancelled", "completed"),
        allowNull: false,
        defaultValue: "none",
      },

      //FK
      deliveryId: { type: DataTypes.INTEGER, allowNull: false },
      requestId: { type: DataTypes.INTEGER, allowNull: false },
      vehicleId: { type: DataTypes.INTEGER, allowNull: false },
    },
    {
      sequelize,
      tableName: "DeliveryItem",
      timestamps: true,
      indexes: [
        //FK
        { fields: ["deliveryId"] },
        { fields: ["requestId"] },
        { fields: ["vehicleId"] },

        //indexes
        { fields: ["deliveryId", "status"] },
      ],
    },
  );

  return DeliveryItem;
}
