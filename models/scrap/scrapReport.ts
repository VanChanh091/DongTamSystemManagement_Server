import { DataTypes, Model, Optional, Sequelize } from "sequelize";

// export type typeScrap = "forklift" | "inventory" | "core_tube" | "other";

//định nghĩa trường trong bảng
interface ScrapReportAttributes {
  scrapId: number;
  // type: typeScrap;
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

  createdAt?: Date;
  updatedAt?: Date;
}

//cho phép bỏ qua id khi tạo
export type ScrapReportCreationAttributes = Optional<
  ScrapReportAttributes,
  "scrapId" | "createdAt" | "shiftProduction" | "createdAt" | "updatedAt"
>;

//định nghĩa kiểu OOP
export class ScrapReport
  extends Model<ScrapReportAttributes, ScrapReportCreationAttributes>
  implements ScrapReportAttributes
{
  declare scrapId: number;
  // declare type: typeScrap;

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

  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;
}

export function initScrapReportModel(sequelize: Sequelize): typeof ScrapReport {
  ScrapReport.init(
    {
      scrapId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      // type: {
      //   type: DataTypes.ENUM("forklift", "inventory", "core_tube", "other"), // xe nâng, tồn kho, lõi cuộn, v.v.
      //   allowNull: false,
      // },
      qtyForklift: { type: DataTypes.DOUBLE }, //xe nâng
      qtyInventory: { type: DataTypes.DOUBLE }, //lưu kho
      qtyCoreTube: { type: DataTypes.DOUBLE }, //ống nòng
      qtyProduction: { type: DataTypes.DOUBLE }, //sản xuất
      qtyOther: { type: DataTypes.DOUBLE }, //khác
      totalQtyScrap: { type: DataTypes.DOUBLE, allowNull: false }, //tổng số lượng phế liệu
      machine: { type: DataTypes.STRING, allowNull: false },
      shiftProduction: { type: DataTypes.ENUM("Ca 1", "Ca 2", "Ca 3"), allowNull: false },
      reportedBy: { type: DataTypes.STRING, allowNull: false },
      reportedAt: { type: DataTypes.DATE, allowNull: false },
    },
    {
      sequelize,
      tableName: "ScrapReports",
      timestamps: true,
      indexes: [
        //get
        // { fields: ["type"] },
        { fields: ["reportedAt"] },
        { fields: ["machine"] },
      ],
    },
  );

  return ScrapReport;
}
