import { DataTypes, Model, Optional, Sequelize } from "sequelize";
import { Suppliers } from "./suppliers";
import { PaperTypes } from "./paperTypes";
import { PaperClassifications } from "./paperClassifications";

export type LayerTypeEnum = "NONE" | "LINER" | "FLUTE";

//định nghĩa trường trong bảng
interface SupplierPaperCodesAttributes {
  supplierPaperId: number;
  layerType: LayerTypeEnum;
  supplierCode: string;
  companyCode: string;

  //FK
  supplierId: number;
  paperTypeId: number;

  createdAt?: Date;
  updatedAt?: Date;
}

//cho phép bỏ qua id khi tạo
export type SupplierPaperCodesCreationAttributes = Optional<
  SupplierPaperCodesAttributes,
  "supplierPaperId" | "layerType" | "createdAt" | "updatedAt"
>;

//định nghĩa kiểu OOP
export class SupplierPaperCodes
  extends Model<SupplierPaperCodesAttributes, SupplierPaperCodesCreationAttributes>
  implements SupplierPaperCodesAttributes
{
  declare supplierPaperId: number;
  declare layerType: LayerTypeEnum;
  declare supplierCode: string;
  declare companyCode: string;

  //FK
  declare supplierId: number;
  declare Suppliers: Suppliers;

  declare paperTypeId: number;
  declare PaperTypes: PaperTypes;

  declare classifications: PaperClassifications[];

  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;
}

export function initSupplierPaperCodesModel(sequelize: Sequelize): typeof SupplierPaperCodes {
  SupplierPaperCodes.init(
    {
      supplierPaperId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      layerType: {
        type: DataTypes.ENUM("NONE", "LINER", "FLUTE"),
        allowNull: false,
        defaultValue: "NONE",
      },
      supplierCode: { type: DataTypes.STRING, allowNull: false },
      companyCode: { type: DataTypes.STRING, allowNull: false },

      //FK
      supplierId: { type: DataTypes.INTEGER, allowNull: false },
      paperTypeId: { type: DataTypes.INTEGER, allowNull: false },
    },
    {
      sequelize,
      tableName: "admin_supplier_paper_codes",
      timestamps: true,
      indexes: [{ fields: ["supplierId"] }, { fields: ["paperTypeId"] }],
    },
  );

  return SupplierPaperCodes;
}
