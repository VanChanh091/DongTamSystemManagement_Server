import { DataTypes, Model, Optional, Sequelize } from "sequelize";

//định nghĩa trường trong bảng
interface CriteriaPaperCheckAttributes {
  criteriaPaperId: number;
  criteriaPaperCode: string;
  criteriaPaperName: string;
  isRequired: boolean;
  variance?: number;

  createdAt?: Date;
  updatedAt?: Date;
}

//cho phép bỏ qua id khi tạo
export type CriteriaPaperCheckCreationAttributes = Optional<
  CriteriaPaperCheckAttributes,
  "criteriaPaperId" | "createdAt" | "updatedAt"
>;

//định nghĩa kiểu OOP
export class CriteriaPaperCheck
  extends Model<CriteriaPaperCheckAttributes, CriteriaPaperCheckCreationAttributes>
  implements CriteriaPaperCheckAttributes
{
  declare criteriaPaperId: number;
  declare criteriaPaperCode: string;
  declare criteriaPaperName: string;
  declare isRequired: boolean;
  declare variance?: number;

  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;
}

export function initCriteriaPaperCheckModel(sequelize: Sequelize): typeof CriteriaPaperCheck {
  CriteriaPaperCheck.init(
    {
      criteriaPaperId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      criteriaPaperCode: { type: DataTypes.STRING, allowNull: false },
      criteriaPaperName: { type: DataTypes.STRING, allowNull: false },
      isRequired: { type: DataTypes.BOOLEAN, allowNull: false },
      variance: { type: DataTypes.DOUBLE }, //sai số
    },
    {
      sequelize,
      tableName: "CriteriaPaperCheck",
      timestamps: true,
    },
  );

  return CriteriaPaperCheck;
}
