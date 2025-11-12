import { DataTypes, Model, Optional, Sequelize } from "sequelize";

//định nghĩa trường trong bảng
interface WasteNormBoxAttributes {
  wasteBoxId: number;
  colorNumberOnProduct?: number | null;
  paperNumberOnProduct?: number | null;
  totalLossOnTotalQty: number;
  machineName: string;
  createdAt?: Date;
  updatedAt?: Date;
}

//cho phép bỏ qua id khi tạo
export type WasteNormBoxCreationAttributes = Optional<
  WasteNormBoxAttributes,
  "wasteBoxId" | "colorNumberOnProduct" | "paperNumberOnProduct" | "createdAt" | "updatedAt"
>;

//định nghĩa kiểu OOP
export class WasteNormBox
  extends Model<WasteNormBoxAttributes, WasteNormBoxCreationAttributes>
  implements WasteNormBoxAttributes
{
  declare wasteBoxId: number;
  declare colorNumberOnProduct: number | null;
  declare paperNumberOnProduct: number | null;
  declare totalLossOnTotalQty: number;
  declare machineName: string;
  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;
}

export function initWasteNormBoxModel(sequelize: Sequelize): typeof WasteNormBox {
  WasteNormBox.init(
    {
      wasteBoxId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      colorNumberOnProduct: { type: DataTypes.INTEGER },
      paperNumberOnProduct: { type: DataTypes.INTEGER },
      totalLossOnTotalQty: { type: DataTypes.DOUBLE, allowNull: false },
      machineName: { type: DataTypes.STRING, allowNull: false },
    },
    { sequelize, tableName: "WasteNormBoxes", timestamps: true }
  );

  return WasteNormBox;
}
