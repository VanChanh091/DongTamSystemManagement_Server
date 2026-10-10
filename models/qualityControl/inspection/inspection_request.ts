import { DataTypes, Model, Optional, Sequelize } from "sequelize";
import { PlanningPaper } from "../../planning/planningPaper";

export type InspecRequestStatus = "pending" | "in_progress" | "passed" | "failed";

//định nghĩa trường trong bảng
interface InspectionRequestAttributes {
  inspectionId: number;
  requestedAt: Date;
  requestedBy: string;
  arrivedAt?: Date;
  completedBy?: string;
  status: InspecRequestStatus;
  result?: boolean;

  createdAt?: Date;
  updatedAt?: Date;

  //FK
  planningId: number;
}

//cho phép bỏ qua id khi tạo
export type InspectionRequestCreationAttributes = Optional<
  InspectionRequestAttributes,
  | "inspectionId"
  | "planningId"
  | "requestedAt"
  | "arrivedAt"
  | "completedBy"
  | "status"
  | "result"
  | "createdAt"
  | "updatedAt"
>;

//định nghĩa kiểu OOP
export class InspectionRequest
  extends Model<InspectionRequestAttributes, InspectionRequestCreationAttributes>
  implements InspectionRequestAttributes
{
  declare inspectionId: number;
  declare requestedAt: Date;
  declare requestedBy: string;
  declare arrivedAt?: Date;
  declare completedBy?: string;
  declare status: InspecRequestStatus;
  declare result?: boolean;

  //FK
  declare planningId: number;
  declare PlanningPaper: PlanningPaper;

  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;
}

export function initInspectionRequestModel(sequelize: Sequelize): typeof InspectionRequest {
  InspectionRequest.init(
    {
      inspectionId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      requestedAt: { type: DataTypes.DATE, allowNull: false },
      requestedBy: { type: DataTypes.STRING, allowNull: false },
      arrivedAt: { type: DataTypes.DATE },
      completedBy: { type: DataTypes.STRING },
      status: {
        type: DataTypes.ENUM("pending", "in_progress", "passed", "failed"),
        allowNull: false,
        defaultValue: "pending",
      },
      result: { type: DataTypes.BOOLEAN, allowNull: true },

      //FK
      planningId: { type: DataTypes.INTEGER, allowNull: false },
    },
    {
      sequelize,
      tableName: "inspection_requests",
      timestamps: true,
      indexes: [
        //FK
        { fields: ["planningId"] },
        { fields: ["status"] },
        { fields: ["result"] },
      ],
    },
  );

  return InspectionRequest;
}
