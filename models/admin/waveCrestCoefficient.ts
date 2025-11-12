import { DataTypes, Model, Optional, Sequelize } from "sequelize";

interface WaveCrestAttributes {
  waveCrestCoefficientId: number;
  fluteE_1?: number | null;
  fluteE_2?: number | null;
  fluteB?: number | null;
  fluteC?: number | null;
  machineName?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type WaveCrestCreationAttributes = Optional<
  WaveCrestAttributes,
  | "waveCrestCoefficientId"
  | "fluteE_1"
  | "fluteE_2"
  | "fluteB"
  | "fluteC"
  | "machineName"
  | "createdAt"
  | "updatedAt"
>;

export class WaveCrestCoefficient
  extends Model<WaveCrestAttributes, WaveCrestCreationAttributes>
  implements WaveCrestAttributes
{
  declare waveCrestCoefficientId: number;
  declare fluteE_1?: number | null;
  declare fluteE_2?: number | null;
  declare fluteB?: number | null;
  declare fluteC?: number | null;
  declare machineName?: string | null;
  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;
}

export function initWaveCrestCoefficientModel(sequelize: Sequelize) {
  WaveCrestCoefficient.init(
    {
      waveCrestCoefficientId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      fluteE_1: { type: DataTypes.DOUBLE },
      fluteE_2: { type: DataTypes.DOUBLE },
      fluteB: { type: DataTypes.DOUBLE },
      fluteC: { type: DataTypes.DOUBLE },
      machineName: { type: DataTypes.STRING },
    },
    { sequelize, tableName: "WaveCrestCoefficients", timestamps: true }
  );

  return WaveCrestCoefficient;
}
