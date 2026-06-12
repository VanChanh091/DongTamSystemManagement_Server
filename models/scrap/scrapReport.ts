import { DataTypes, Model, Optional, Sequelize } from "sequelize";

export type statusScrap = "pending" | "confirmed" | "allocated" | "rejected";

//định nghĩa trường trong bảng
interface ScrapReportAttributes {
  scrapId: number;
  qtyForklift?: number;
  qtyInventory?: number;
  qtyCoreTube?: number;
  qtyProduction?: number;
  qtyOther?: number;
  totalQtyScrap: number;

  machine: string;
  shiftProduction: "Ca 1" | "Ca 2" | "Ca 3";
  reportedBy: string;
  reportedAt: Date;
  dayCompleted: Date;
  rejectReason?: string;
  status: statusScrap;

  createdAt?: Date;
  updatedAt?: Date;
}

//cho phép bỏ qua id khi tạo
export type ScrapReportCreationAttributes = Optional<
  ScrapReportAttributes,
  | "scrapId"
  | "createdAt"
  | "shiftProduction"
  | "status"
  | "reportedAt"
  | "reportedBy"
  | "dayCompleted"
  | "rejectReason"
  | "createdAt"
  | "updatedAt"
>;

//định nghĩa kiểu OOP
export class ScrapReport
  extends Model<ScrapReportAttributes, ScrapReportCreationAttributes>
  implements ScrapReportAttributes
{
  declare scrapId: number;
  declare qtyForklift?: number;
  declare qtyInventory?: number;
  declare qtyCoreTube?: number;
  declare qtyProduction?: number;
  declare qtyOther?: number;
  declare totalQtyScrap: number;
  declare machine: string;
  declare shiftProduction: "Ca 1" | "Ca 2" | "Ca 3";
  declare reportedBy: string;
  declare reportedAt: Date;
  declare dayCompleted: Date;
  declare rejectReason?: string;
  declare status: statusScrap;

  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;
}

export function initScrapReportModel(sequelize: Sequelize): typeof ScrapReport {
  ScrapReport.init(
    {
      scrapId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

      qtyForklift: { type: DataTypes.DOUBLE }, //xe nâng
      qtyInventory: { type: DataTypes.DOUBLE }, //lưu kho
      qtyCoreTube: { type: DataTypes.DOUBLE }, //ống nòng
      qtyProduction: { type: DataTypes.DOUBLE }, //sản xuất
      qtyOther: { type: DataTypes.DOUBLE }, //khác
      totalQtyScrap: { type: DataTypes.DOUBLE, allowNull: false }, //tổng số lượng phế liệu

      machine: { type: DataTypes.STRING, allowNull: false },
      shiftProduction: { type: DataTypes.ENUM("Ca 1", "Ca 2", "Ca 3"), allowNull: false },

      reportedBy: { type: DataTypes.STRING, allowNull: false },
      reportedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        get() {
          const rawValue = this.getDataValue("reportedAt");
          if (!rawValue) return null;
          return new Date(rawValue.getTime() - rawValue.getTimezoneOffset() * 60000).toISOString();
        },
      },
      dayCompleted: { type: DataTypes.DATE, allowNull: false },

      rejectReason: { type: DataTypes.STRING },
      status: {
        type: DataTypes.ENUM("pending", "confirmed", "allocated", "rejected"),
        allowNull: false,
        defaultValue: "pending",
      },
    },
    {
      sequelize,
      tableName: "ScrapReports",
      timestamps: true,
      indexes: [
        //get
        { fields: ["reportedAt"] },

        //composite index
        { fields: ["status", "scrapId"] },
        { fields: ["machine", "status"] },
      ],
    },
  );

  return ScrapReport;
}
