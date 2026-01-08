import { DataTypes, Model, Optional, Sequelize } from "sequelize";

interface FluteRatioAttributes {
  fluteRatioId: number;
  fluteName: string;
  ratio: number;

  createdAt?: Date;
  updatedAt?: Date;
}

export type FluteRatioCreationAttributes = Optional<
  FluteRatioAttributes,
  "fluteRatioId" | "createdAt" | "updatedAt"
>;

export class FluteRatio
  extends Model<FluteRatioAttributes, FluteRatioCreationAttributes>
  implements FluteRatioAttributes
{
  declare fluteRatioId: number;
  declare fluteName: string;
  declare ratio: number;

  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;
}

export function initFluteRatioCoefficientModel(sequelize: Sequelize) {
  FluteRatio.init(
    {
      fluteRatioId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      fluteName: { type: DataTypes.STRING, allowNull: false },
      ratio: { type: DataTypes.DOUBLE, allowNull: false },
    },
    { sequelize, tableName: "fluteRatio", timestamps: true }
  );

  return FluteRatio;
}
