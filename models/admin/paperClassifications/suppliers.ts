import { DataTypes, Model, Optional, Sequelize } from "sequelize";
import { SupplierPaperCodes } from "./supplierPaperCodes";

//định nghĩa trường trong bảng
interface SuppliersAttributes {
  supplierId: number;
  supplierName: string;
  supplierCode: string;
  transferCode: string;
  isActive: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

//cho phép bỏ qua id khi tạo
export type SuppliersCreationAttributes = Optional<
  SuppliersAttributes,
  "supplierId" | "createdAt" | "updatedAt"
>;

//định nghĩa kiểu OOP
export class Suppliers
  extends Model<SuppliersAttributes, SuppliersCreationAttributes>
  implements SuppliersAttributes
{
  declare supplierId: number;
  declare supplierName: string;
  declare supplierCode: string;
  declare transferCode: string;
  declare isActive: boolean;

  //Association
  declare supplierPapers: SupplierPaperCodes[];

  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;
}

export function initSuppliersModel(sequelize: Sequelize): typeof Suppliers {
  Suppliers.init(
    {
      supplierId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      supplierName: { type: DataTypes.STRING, allowNull: false },
      supplierCode: { type: DataTypes.STRING, allowNull: false },
      transferCode: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "Mã chuyển đổi của công ty",
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: "Kiểm tra còn sử dụng hàng của NCC này không",
      },
    },
    {
      sequelize,
      tableName: "admin_suppliers",
      timestamps: true,
    },
  );

  return Suppliers;
}
