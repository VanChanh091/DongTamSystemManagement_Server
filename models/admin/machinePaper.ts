import { DataTypes, Model, Optional, Sequelize } from "sequelize";

interface MachinePaperAttributes {
  machineId: number;
  machineName?: string | null;
  timeChangeSize: number;
  timeChangeSameSize: number;
  speed2Layer: number;
  speed3Layer: number;
  speed4Layer: number;
  speed5Layer: number;
  speed6Layer: number;
  speed7Layer: number;
  paperRollSpeed: number;
  machinePerformance: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export type MachinePaperCreationAttributes = Optional<
  MachinePaperAttributes,
  "machineId" | "machineName" | "createdAt" | "updatedAt"
>;

export class MachinePaper
  extends Model<MachinePaperAttributes, MachinePaperCreationAttributes>
  implements MachinePaperAttributes
{
  declare machineId: number;
  declare machineName?: string | null;
  declare timeChangeSize: number;
  declare timeChangeSameSize: number;
  declare speed2Layer: number;
  declare speed3Layer: number;
  declare speed4Layer: number;
  declare speed5Layer: number;
  declare speed6Layer: number;
  declare speed7Layer: number;
  declare paperRollSpeed: number;
  declare machinePerformance: number;
  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;
}

export function initMachinePaperModel(sequelize: Sequelize): typeof MachinePaper {
  MachinePaper.init(
    {
      machineId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      machineName: { type: DataTypes.STRING },
      timeChangeSize: { type: DataTypes.INTEGER, allowNull: false }, //thời gian đổi cùng khổ
      timeChangeSameSize: { type: DataTypes.INTEGER, allowNull: false }, //thời gian đổi khác khổ
      speed2Layer: { type: DataTypes.INTEGER, allowNull: false },
      speed3Layer: { type: DataTypes.INTEGER, allowNull: false },
      speed4Layer: { type: DataTypes.INTEGER, allowNull: false },
      speed5Layer: { type: DataTypes.INTEGER, allowNull: false },
      speed6Layer: { type: DataTypes.INTEGER, allowNull: false },
      speed7Layer: { type: DataTypes.INTEGER, allowNull: false },
      paperRollSpeed: { type: DataTypes.INTEGER, allowNull: false }, //tốc độ quấn cuồn
      machinePerformance: { type: DataTypes.DOUBLE, allowNull: false }, //hiệu suất hoạt động
    },
    { sequelize, tableName: "MachinePapers", timestamps: true }
  );

  return MachinePaper;
}
