import { DataTypes, Model, Optional, Sequelize } from "sequelize";

//định nghĩa trường trong bảng
interface DailyReportPerformanceAttributes {
  dailyReportId: number;
  dayReport: Date;
  machine: string;
  flute: number;
  totalLength: number;
  totalDurations: number;

  createdAt?: Date;
  updatedAt?: Date;
}

//cho phép bỏ qua id khi tạo
export type DailyReportPerformanceCreationAttributes = Optional<
  DailyReportPerformanceAttributes,
  "dailyReportId" | "createdAt" | "updatedAt"
>;

//định nghĩa kiểu OOP
export class DailyReportPerformance
  extends Model<DailyReportPerformanceAttributes, DailyReportPerformanceCreationAttributes>
  implements DailyReportPerformanceAttributes
{
  declare dailyReportId: number;
  declare dayReport: Date;
  declare machine: string;
  declare flute: number;
  declare totalLength: number;
  declare totalDurations: number;

  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;
}

export function initDailyReportModel(sequelize: Sequelize): typeof DailyReportPerformance {
  DailyReportPerformance.init(
    {
      dailyReportId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      dayReport: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        // get() {
        //   const rawValue = this.getDataValue("dayReport");
        //   if (!rawValue) return null;
        //   return new Date(rawValue.getTime() - rawValue.getTimezoneOffset() * 60000).toISOString();
        // },
      },
      machine: { type: DataTypes.STRING, allowNull: false },
      flute: { type: DataTypes.INTEGER, allowNull: false },
      totalLength: { type: DataTypes.DOUBLE, allowNull: false },
      totalDurations: { type: DataTypes.INTEGER, allowNull: false },
    },
    {
      sequelize,
      tableName: "ReportPerformances",
      timestamps: true,
      indexes: [
        //indexes
        { fields: ["dayReport", "machine", "flute"] },
      ],
    },
  );

  return DailyReportPerformance;
}
