import { DataTypes, Model, Optional, Sequelize } from "sequelize";

interface MachineBoxAttributes {
  machineId: number;
  timeToProduct: number;
  speedOfMachine: number;
  machineName: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type MachineBoxCreationAttributes = Optional<
  MachineBoxAttributes,
  "machineId" | "createdAt" | "updatedAt"
>;

export class MachineBox
  extends Model<MachineBoxAttributes, MachineBoxCreationAttributes>
  implements MachineBoxAttributes
{
  declare machineId: number;
  declare timeToProduct: number;
  declare speedOfMachine: number;
  declare machineName: string;
  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;
}

export function initMachineBoxModel(sequelize: Sequelize): typeof MachineBox {
  MachineBox.init(
    {
      machineId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      timeToProduct: { type: DataTypes.INTEGER, allowNull: false },
      speedOfMachine: { type: DataTypes.INTEGER, allowNull: false },
      machineName: { type: DataTypes.STRING, allowNull: false },
    },
    { sequelize, tableName: "MachineBoxes", timestamps: true }
  );

  return MachineBox;
}
