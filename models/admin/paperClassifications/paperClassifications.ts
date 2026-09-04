import { DataTypes, Model, Optional, Sequelize } from "sequelize";
import { SupplierPaperCodes } from "./supplierPaperCodes";
import { PaperBasisWeights } from "./paperBasisWeights";

//định nghĩa trường trong bảng
export interface PaperClassificationsAttributes {
  classificationId: number;
  paperCode: string;
  weightCategory: string;
  burstRatio?: number;
  burstStrength?: number;
  ringCrush?: number;
  pricePaper?: number;

  //FK
  supplierPaperId: number;
  basisWeightId: number;

  createdAt?: Date;
  updatedAt?: Date;
}

//cho phép bỏ qua id khi tạo
export type PaperClassificationsCreationAttributes = Optional<
  PaperClassificationsAttributes,
  "classificationId" | "createdAt" | "updatedAt"
>;

//định nghĩa kiểu OOP
export class PaperClassifications
  extends Model<PaperClassificationsAttributes, PaperClassificationsCreationAttributes>
  implements PaperClassificationsAttributes
{
  declare classificationId: number;
  declare paperCode: string;
  declare weightCategory: string;
  declare burstRatio?: number;
  declare burstStrength?: number;
  declare ringCrush?: number;
  declare pricePaper?: number;

  //FK
  declare supplierPaperId: number;
  declare supplierPaper: SupplierPaperCodes;

  declare basisWeightId: number;
  declare basisWeight: PaperBasisWeights;

  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;
}

export function initPaperClassificationsModel(sequelize: Sequelize): typeof PaperClassifications {
  PaperClassifications.init(
    {
      classificationId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      paperCode: { type: DataTypes.STRING, allowNull: false, comment: "Mã giấy lưu kho" },
      weightCategory: { type: DataTypes.STRING, allowNull: false, comment: "Phân loại định lượng" },

      burstRatio: { type: DataTypes.DOUBLE, allowNull: true, comment: "Tỷ lệ độ bục" },
      burstStrength: { type: DataTypes.DOUBLE, allowNull: true, comment: "Độ bục" },
      ringCrush: { type: DataTypes.DOUBLE, allowNull: true, comment: "Độ bền nén vòng" },
      pricePaper: { type: DataTypes.DOUBLE, allowNull: true, defaultValue: 0 },

      //FK
      supplierPaperId: { type: DataTypes.INTEGER, allowNull: false },
      basisWeightId: { type: DataTypes.INTEGER, allowNull: false },
    },
    {
      sequelize,
      tableName: "admin_paper_classifications",
      timestamps: true,
      indexes: [{ fields: ["supplierPaperId"] }, { fields: ["basisWeightId"] }],
    },
  );

  return PaperClassifications;
}
