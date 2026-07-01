import { DataTypes, Model, Optional, Sequelize } from "sequelize";

//định nghĩa trường trong bảng
interface CriteriaBoxCheckAttributes {
  criteriaBoxId: number;
  criteriaBoxCode: string;
  criteriaBoxName: string;
  variance?: number;
  machine: string;

  createdAt?: Date;
  updatedAt?: Date;
}

//cho phép bỏ qua id khi tạo
export type CriteriaBoxCheckCreationAttributes = Optional<
  CriteriaBoxCheckAttributes,
  "criteriaBoxId" | "createdAt" | "updatedAt"
>;

//định nghĩa kiểu OOP
export class CriteriaBoxCheck
  extends Model<CriteriaBoxCheckAttributes, CriteriaBoxCheckCreationAttributes>
  implements CriteriaBoxCheckAttributes
{
  declare criteriaBoxId: number;
  declare criteriaBoxCode: string;
  declare criteriaBoxName: string;
  declare variance?: number;
  declare machine: string;

  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;
}

export function initCriteriaBoxCheckModel(sequelize: Sequelize): typeof CriteriaBoxCheck {
  CriteriaBoxCheck.init(
    {
      criteriaBoxId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      criteriaBoxCode: { type: DataTypes.STRING, allowNull: false },
      criteriaBoxName: { type: DataTypes.STRING, allowNull: false },
      variance: { type: DataTypes.DOUBLE }, //sai số
      machine: { type: DataTypes.STRING, allowNull: false },
    },
    {
      sequelize,
      tableName: "CriteriaBoxCheck",
      timestamps: true,
    },
  );

  return CriteriaBoxCheck;
}
