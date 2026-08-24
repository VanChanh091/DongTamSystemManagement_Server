import { DataTypes, Model, Optional, Sequelize } from "sequelize";
import { SupplierPaperCodes } from "./supplierPaperCodes";

//định nghĩa trường trong bảng
interface PaperTypesAttributes {
  paperTypeId: number;
  paperName: string;
  paperCode: string;
  grade: number;

  createdAt?: Date;
  updatedAt?: Date;
}

//cho phép bỏ qua id khi tạo
export type PaperTypesCreationAttributes = Optional<
  PaperTypesAttributes,
  "paperTypeId" | "grade" | "createdAt" | "updatedAt"
>;

//định nghĩa kiểu OOP
export class PaperTypes
  extends Model<PaperTypesAttributes, PaperTypesCreationAttributes>
  implements PaperTypesAttributes
{
  declare paperTypeId: number;
  declare paperName: string;
  declare paperCode: string;
  declare grade: number;

  //Association
  declare supplierPapers: SupplierPaperCodes[];

  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;
}

export function initPaperTypesModel(sequelize: Sequelize): typeof PaperTypes {
  PaperTypes.init(
    {
      paperTypeId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      paperName: { type: DataTypes.STRING, allowNull: false },
      paperCode: { type: DataTypes.STRING, allowNull: false },
      grade: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: { isIn: [[1, 2, 3, 4]] },
        comment: "1: Tốt, 2: Khá, 3: Trung bình, 4: Kém",
      },
    },
    {
      sequelize,
      tableName: "admin_paper_types",
      timestamps: true,
    },
  );

  return PaperTypes;
}
