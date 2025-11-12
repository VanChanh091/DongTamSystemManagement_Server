import { DataTypes, Model, Optional, Sequelize } from "sequelize";
import { PlanningPaper } from "../planning/planningPaper";

//định nghĩa trường trong bảng
interface ReportPlanningPaperAttributes {
  reportPaperId: number;
  dayReport: Date;
  qtyProduced: number;
  lackOfQty: number;
  qtyWasteNorm: number;
  shiftProduction: "Ca 1" | "Ca 2" | "Ca 3";
  shiftManagement: string;
  createdAt?: Date;
  updatedAt?: Date;

  //FK
  planningId: number;
}

//cho phép bỏ qua id khi tạo
type ReportPlanningPaperCreationAttributes = Optional<
  ReportPlanningPaperAttributes,
  "reportPaperId" | "createdAt" | "updatedAt"
>;

//định nghĩa kiểu OOP
export class ReportPlanningPaper
  extends Model<ReportPlanningPaperAttributes, ReportPlanningPaperCreationAttributes>
  implements ReportPlanningPaperAttributes
{
  declare reportPaperId: number;
  declare dayReport: Date;
  declare qtyProduced: number;
  declare lackOfQty: number;
  declare qtyWasteNorm: number;
  declare shiftProduction: "Ca 1" | "Ca 2" | "Ca 3";
  declare shiftManagement: string;
  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;

  //FK
  declare planningId: number;
  declare Planning: PlanningPaper;
}

export function initReportPlanningPaperModel(sequelize: Sequelize): typeof ReportPlanningPaper {
  ReportPlanningPaper.init(
    {
      reportPaperId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      dayReport: {
        type: DataTypes.DATE,
        allowNull: false,
        get() {
          const rawValue = this.getDataValue("dayReport");
          if (!rawValue) return null;
          return new Date(rawValue.getTime() - rawValue.getTimezoneOffset() * 60000).toISOString();
        },
      },
      qtyProduced: { type: DataTypes.INTEGER, allowNull: false },
      lackOfQty: { type: DataTypes.INTEGER, allowNull: false },
      qtyWasteNorm: { type: DataTypes.DOUBLE, allowNull: false },
      shiftProduction: { type: DataTypes.ENUM("Ca 1", "Ca 2", "Ca 3"), allowNull: false },
      shiftManagement: { type: DataTypes.STRING, allowNull: false },

      //FK
      planningId: { type: DataTypes.INTEGER, allowNull: false },
    },
    { sequelize, tableName: "ReportPlanningPapers", timestamps: true }
  );

  return ReportPlanningPaper;
}
