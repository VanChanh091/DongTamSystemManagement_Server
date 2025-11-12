import { DataTypes, Model, Optional, Sequelize } from "sequelize";

interface WasteNormPaperAttributes {
  wasteNormId: number;
  waveCrest: number;
  waveCrestSoft?: number | null;
  lossInProcess: number;
  lossInSheetingAndSlitting: number;
  machineName?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type WasteNormPaperCreationAttributes = Optional<
  WasteNormPaperAttributes,
  "wasteNormId" | "waveCrestSoft" | "machineName" | "createdAt" | "updatedAt"
>;

export class WasteNormPaper
  extends Model<WasteNormPaperAttributes, WasteNormPaperCreationAttributes>
  implements WasteNormPaperAttributes
{
  declare wasteNormId: number;
  declare waveCrest: number;
  declare waveCrestSoft?: number | null;
  declare lossInProcess: number;
  declare lossInSheetingAndSlitting: number;
  declare machineName?: string | null;
  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;
}

export function initWasteNormPaperModel(sequelize: Sequelize): typeof WasteNormPaper {
  WasteNormPaper.init(
    {
      wasteNormId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      waveCrest: { type: DataTypes.DOUBLE, allowNull: false }, //giấy đầu sóng
      waveCrestSoft: { type: DataTypes.DOUBLE }, //giấy đầu mềm
      lossInProcess: { type: DataTypes.DOUBLE, allowNull: false }, //hao phí trong quá trình chạy
      lossInSheetingAndSlitting: { type: DataTypes.DOUBLE, allowNull: false }, //hao phí xả tờ - chia khổ
      machineName: { type: DataTypes.STRING },
    },
    { sequelize, tableName: "WasteNorms", timestamps: true }
  );

  return WasteNormPaper;
}
