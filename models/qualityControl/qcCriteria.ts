import { DataTypes, Model, Optional, Sequelize } from "sequelize";

export type processTypeQC = "paper" | "box";

//định nghĩa trường trong bảng
 interface QcCriteriaAttributes {
  qcCriteriaId: number;
  processType: processTypeQC;
  criteriaCode: string;
  criteriaName: string;
  isRequired: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

//cho phép bỏ qua id khi tạo
export type QcCriteriaCreationAttributes = Optional<
  QcCriteriaAttributes,
  "qcCriteriaId" | "createdAt" | "updatedAt"
>;

//định nghĩa kiểu OOP
export class QcCriteria
  extends Model<QcCriteriaAttributes, QcCriteriaCreationAttributes>
  implements QcCriteriaAttributes
{
  declare qcCriteriaId: number;
  declare processType: processTypeQC;
  declare criteriaCode: string;
  declare criteriaName: string;
  declare isRequired: boolean;

  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;
}

export function initQcCriteriaModel(sequelize: Sequelize): typeof QcCriteria {
  QcCriteria.init(
    {
      qcCriteriaId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      processType: { type: DataTypes.ENUM("paper", "box"), allowNull: false },
      criteriaCode: { type: DataTypes.STRING, allowNull: false },
      criteriaName: { type: DataTypes.STRING, allowNull: false },
      isRequired: { type: DataTypes.BOOLEAN, allowNull: false },
    },
    { sequelize, tableName: "QcCriteria", timestamps: true }
  );

  return QcCriteria;
}
