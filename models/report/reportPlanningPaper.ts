import { DataTypes, Model, Optional, Sequelize } from "sequelize";
import { PlanningPaper } from "../planning/planningPaper";

//định nghĩa trường trong bảng
interface ReportPlanningPaperAttributes {
  reportPaperId: number;
  dayReport: Date;
  qtyProduced: number;
  lackOfQty: number;
  qtyWasteNorm: number;
  totalPrice: number;
  shiftProduction: "Ca 1" | "Ca 2" | "Ca 3";
  shiftManagement: string;
  reportedBy: string;
  averageSpeed: number;

  createdAt?: Date;
  updatedAt?: Date;

  //FK
  planningId: number;
}

//cho phép bỏ qua id khi tạo
export type ReportPlanningPaperCreationAttributes = Optional<
  ReportPlanningPaperAttributes,
  | "reportPaperId"
  | "qtyWasteNorm"
  | "totalPrice"
  | "shiftProduction"
  | "createdAt"
  | "updatedAt"
  | "averageSpeed"
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
  declare totalPrice: number;
  declare shiftProduction: "Ca 1" | "Ca 2" | "Ca 3";
  declare shiftManagement: string;
  declare reportedBy: string;
  declare averageSpeed: number;

  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;

  //FK
  declare planningId: number;
  declare PlanningPaper: PlanningPaper;
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
      totalPrice: { type: DataTypes.DOUBLE, allowNull: false, defaultValue: 0 },
      qtyWasteNorm: { type: DataTypes.DOUBLE, allowNull: false, defaultValue: 0 },
      shiftProduction: { type: DataTypes.ENUM("Ca 1", "Ca 2", "Ca 3"), allowNull: false },
      shiftManagement: { type: DataTypes.STRING, allowNull: false },
      reportedBy: { type: DataTypes.STRING, allowNull: false },
      averageSpeed: { type: DataTypes.DOUBLE, allowNull: false, defaultValue: 0 },

      //FK
      planningId: { type: DataTypes.INTEGER, allowNull: false },
    },
    {
      sequelize,
      tableName: "ReportPlanningPapers",
      timestamps: true,
      indexes: [
        //FK
        { fields: ["planningId"] },

        //indexes
        { fields: ["dayReport"] },
      ],
    },
  );

  return ReportPlanningPaper;
}
