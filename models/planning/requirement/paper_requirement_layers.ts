import { DataTypes, Model, Optional, Sequelize } from "sequelize";
import { PaperRequirements } from "./paperRequirements";

export type layerRoleType =
  | "BOTTOM"
  | "FLUTE_1"
  | "MID_1"
  | "FLUTE_2"
  | "MID_2"
  | "FLUTE_3"
  | "TOP";
export type paperCodeType = "E" | "B" | "C";

//định nghĩa trường trong bảng
interface PaperRequirementLayersAttributes {
  layerId: number;
  layerIndex: number;
  layerRole: layerRoleType;
  paperCode: paperCodeType;
  weightGsm: number;
  fluteType?: string;

  availableStock: number;
  shortageQty: number;
  isEnoughQty: boolean;

  //FK
  requirementId: number;

  createdAt?: Date;
  updatedAt?: Date;
}

//cho phép bỏ qua id khi tạo
export type PaperRequirementLayersCreationAttributes = Optional<
  PaperRequirementLayersAttributes,
  "layerId" | "requirementId" | "fluteType" | "layerRole" | "createdAt" | "updatedAt"
>;

//định nghĩa kiểu OOP
export class PaperRequirementLayers
  extends Model<PaperRequirementLayersAttributes, PaperRequirementLayersCreationAttributes>
  implements PaperRequirementLayersAttributes
{
  declare layerId: number;
  declare layerIndex: number;
  declare layerRole: layerRoleType;
  declare paperCode: paperCodeType;
  declare weightGsm: number;
  declare fluteType?: string;
  declare availableStock: number;
  declare shortageQty: number;
  declare isEnoughQty: boolean;

  //FK
  declare requirementId: number;
  declare requirements: PaperRequirements;

  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;
}

//tạo table
export function initPaperRequirementLayersModel(
  sequelize: Sequelize,
): typeof PaperRequirementLayers {
  PaperRequirementLayers.init(
    {
      layerId: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      layerIndex: { type: DataTypes.INTEGER, allowNull: false, comment: "Vị trí của lớp giấy" },
      layerRole: {
        type: DataTypes.ENUM("BOTTOM", "FLUTE_1", "MID_1", "FLUTE_2", "MID_2", "FLUTE_3", "TOP"),
        allowNull: false,
        defaultValue: "BOTTOM",
      },
      paperCode: { type: DataTypes.STRING, allowNull: false },
      weightGsm: { type: DataTypes.INTEGER, allowNull: false, comment: "Định lượng giấy (g/m2)" },
      fluteType: { type: DataTypes.ENUM("E", "B", "C"), comment: "Loại sóng" },
      availableStock: {
        type: DataTypes.DOUBLE,
        allowNull: false,
        comment: "Số lượng giấy còn trong kho (kg)",
      },
      shortageQty: {
        type: DataTypes.DOUBLE,
        allowNull: false,
        comment: "Số lượng giấy thiếu (kg)",
      },
      isEnoughQty: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        comment: "Kiểm tra xem có đủ lượng giấy không",
      },

      //FK
      requirementId: { type: DataTypes.INTEGER, allowNull: false },
    },
    {
      sequelize,
      tableName: "paper_requirement_layers",
      timestamps: true,
      indexes: [
        //FK
        { fields: ["requirementId"] },
        // { fields: ["paperCode", "paperRollWidth"] },
      ],
    },
  );

  return PaperRequirementLayers;
}
