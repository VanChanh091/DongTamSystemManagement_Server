import { DataTypes, Model, Optional, Sequelize } from "sequelize";
import { SupplierPaperCodes } from "./supplierPaperCodes";

//định nghĩa trường trong bảng
interface SuppliersAttributes {
  supplierId: number;
  supplierName: string;
  supplierCode: string;
  transferCode: string;
  grade: number;
  isActive: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

//cho phép bỏ qua id khi tạo
export type SuppliersCreationAttributes = Optional<
  SuppliersAttributes,
  "supplierId" | "grade" | "createdAt" | "updatedAt"
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
  declare grade: number;
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
      grade: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: { isIn: [[1, 2, 3, 4]] },
        comment: "1: Tốt, 2: Khá, 3: Trung bình, 4: Kém",
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
