import { DataTypes, Model, Optional, Sequelize } from "sequelize";

export type qcChecklistData = Record<string, boolean>;

//định nghĩa trường trong bảng
interface QcSampleResultAttributes {
  qcResultId: number;
  sampleIndex: number;
  checklist: qcChecklistData;
  hasFail: boolean;

  createdAt?: Date;
  updatedAt?: Date;

  //FK
  qcSessionId: number;
}

//cho phép bỏ qua id khi tạo
export type QcSampleResultCreationAttributes = Optional<
  QcSampleResultAttributes,
  "qcResultId" | "createdAt" | "updatedAt"
>;

//định nghĩa kiểu OOP
export class QcSampleResult
  extends Model<QcSampleResultAttributes, QcSampleResultCreationAttributes>
  implements QcSampleResultAttributes
{
  declare qcResultId: number;
  declare sampleIndex: number;
  declare checklist: qcChecklistData;
  declare hasFail: boolean;

  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;

  //FK
  declare qcSessionId: number;
}

export function initQcSamepleResultModel(sequelize: Sequelize): typeof QcSampleResult {
  QcSampleResult.init(
    {
      qcResultId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      sampleIndex: { type: DataTypes.INTEGER, allowNull: false },
      checklist: { type: DataTypes.JSON, allowNull: false },
      hasFail: { type: DataTypes.BOOLEAN, defaultValue: false },

      //FK
      qcSessionId: { type: DataTypes.INTEGER, allowNull: false },
    },
    { sequelize, tableName: "QcSampleResult", timestamps: true }
  );

  return QcSampleResult;
}
