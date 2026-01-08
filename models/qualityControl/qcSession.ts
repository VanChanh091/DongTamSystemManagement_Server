import { DataTypes, Model, Optional, Sequelize } from "sequelize";
import { QcSampleResult } from "./qcSampleResult";

export type statusQcSession = "checking" | "pass" | "fail" | "finalized";
export type processTypeQC = "paper" | "box";

//định nghĩa trường trong bảng
interface QcSessionAttributes {
  qcSessionId: number;
  processType: processTypeQC;
  totalSample: number;
  checkedBy: string;
  status: statusQcSession;

  createdAt?: Date;
  updatedAt?: Date;

  //FK
  planningId: number;
  planningBoxId: number;
}

//cho phép bỏ qua id khi tạo
export type QcSessionCreationAttributes = Optional<
  QcSessionAttributes,
  "qcSessionId" | "status" | "totalSample" | "createdAt" | "updatedAt"
>;

//định nghĩa kiểu OOP
export class QcSession
  extends Model<QcSessionAttributes, QcSessionCreationAttributes>
  implements QcSessionAttributes
{
  declare qcSessionId: number;
  declare processType: processTypeQC;
  declare totalSample: number;
  declare checkedBy: string;
  declare status: statusQcSession;

  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;

  //FK
  declare planningId: number;
  declare planningBoxId: number;

  declare samples: QcSampleResult;
}

export function initQcSessionModel(sequelize: Sequelize): typeof QcSession {
  QcSession.init(
    {
      qcSessionId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      processType: { type: DataTypes.STRING, allowNull: false },
      checkedBy: { type: DataTypes.STRING, allowNull: false },
      totalSample: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 3 },
      status: { type: DataTypes.STRING, defaultValue: "checking" },

      //FK
      planningId: { type: DataTypes.INTEGER },
      planningBoxId: { type: DataTypes.INTEGER },
    },
    { sequelize, tableName: "QcSession", timestamps: true }
  );

  return QcSession;
}
