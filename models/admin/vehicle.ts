import { DataTypes, Model, Optional, Sequelize } from "sequelize";

//định nghĩa trường trong bảng
interface VehicleAttributes {
  vehicleId: number;
  vehicleName: string;
  licensePlate: string;
  maxPayload: number;
  volumeCapacity: number;
  vehicleHouse: string;

  createdAt?: Date;
  updatedAt?: Date;
}

//cho phép bỏ qua id khi tạo
export type VehicleCreationAttributes = Optional<
  VehicleAttributes,
  "vehicleId" | "createdAt" | "updatedAt"
>;

//định nghĩa kiểu OOP
export class Vehicle
  extends Model<VehicleAttributes, VehicleCreationAttributes>
  implements VehicleAttributes
{
  declare vehicleId: number;
  declare vehicleName: string;
  declare licensePlate: string;
  declare maxPayload: number;
  declare volumeCapacity: number;
  declare vehicleHouse: string;

  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;
}

export function initVehicleModel(sequelize: Sequelize): typeof Vehicle {
  Vehicle.init(
    {
      vehicleId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      vehicleName: { type: DataTypes.STRING, allowNull: false },
      licensePlate: { type: DataTypes.STRING, allowNull: false },
      maxPayload: { type: DataTypes.DOUBLE, allowNull: false }, //tai trong
      volumeCapacity: { type: DataTypes.DOUBLE, allowNull: false }, //dung tich
      vehicleHouse: { type: DataTypes.STRING, allowNull: false },
    },
    { sequelize, tableName: "Vehicle", timestamps: true },
  );

  return Vehicle;
}
