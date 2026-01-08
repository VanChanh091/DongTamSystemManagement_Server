import { DataTypes, Model, Optional, Sequelize } from "sequelize";
import { PlanningBox } from "../planning/planningBox";

//định nghĩa trường trong bảng
interface ReportPlanningBoxAttributes {
  reportBoxId: number;
  dayReport: Date;
  qtyProduced: number;
  lackOfQty: number;
  wasteLoss: number;
  shiftManagement: string;
  machine: string;
  createdAt?: Date;
  updatedAt?: Date;

  //FK
  planningBoxId: number;
}

//cho phép bỏ qua id khi tạo
export type ReportPlanningBoxCreationAttributes = Optional<
  ReportPlanningBoxAttributes,
  "reportBoxId" | "createdAt" | "updatedAt"
>;

//định nghĩa kiểu OOP
export class ReportPlanningBox
  extends Model<ReportPlanningBoxAttributes, ReportPlanningBoxCreationAttributes>
  implements ReportPlanningBoxAttributes
{
  declare reportBoxId: number;
  declare dayReport: Date;
  declare qtyProduced: number;
  declare lackOfQty: number;
  declare wasteLoss: number;
  declare shiftManagement: string;
  declare machine: string;
  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;

  //FK
  declare planningBoxId: number;
  declare PlanningBox: PlanningBox;
}

export function initReportPlanningBoxModel(sequelize: Sequelize): typeof ReportPlanningBox {
  ReportPlanningBox.init(
    {
      reportBoxId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
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
      wasteLoss: { type: DataTypes.DOUBLE, allowNull: false },
      shiftManagement: { type: DataTypes.STRING, allowNull: false },
      machine: { type: DataTypes.STRING, allowNull: false },

      //FK
      planningBoxId: { type: DataTypes.INTEGER, allowNull: false },
    },
    { sequelize, tableName: "ReportPlanningBoxes", timestamps: true }
  );

  return ReportPlanningBox;
}
