import { DataTypes, Model, Optional, Sequelize } from "sequelize";
import { PlanningPaper } from "../planningPaper";
import { PaperRequirementLayers } from "./paper_requirement_layers";

export type InventoryStatusType = "ENOUGH" | "SHORTAGE" | "WARNING";
export type StatusRequirementType = "PLANNING" | "COMPLETED";

//định nghĩa trường trong bảng
interface PaperRequirementsAttributes {
  requirementId: number;
  paperRollWidth: number;
  totalRequiredQty: number;
  inventoryStatus: InventoryStatusType;
  status: StatusRequirementType;

  //FK
  planningId: number;

  createdAt?: Date;
  updatedAt?: Date;
}

//cho phép bỏ qua id khi tạo
export type PaperRequirementsCreationAttributes = Optional<
  PaperRequirementsAttributes,
  "requirementId" | "planningId" | "status" | "inventoryStatus" | "createdAt" | "updatedAt"
>;

//định nghĩa kiểu OOP
export class PaperRequirements
  extends Model<PaperRequirementsAttributes, PaperRequirementsCreationAttributes>
  implements PaperRequirementsAttributes
{
  declare requirementId: number;
  declare paperRollWidth: number;
  declare totalRequiredQty: number;
  declare inventoryStatus: InventoryStatusType;
  declare status: StatusRequirementType;

  //FK
  declare planningId: number;
  declare PlanningPaper: PlanningPaper;
  declare layers: PaperRequirementLayers[];

  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;
}

//tạo table
export function initPaperRequirementsModel(sequelize: Sequelize): typeof PaperRequirements {
  PaperRequirements.init(
    {
      requirementId: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      paperRollWidth: { type: DataTypes.INTEGER, allowNull: false, comment: "Khổ giấy được cấp" },
      totalRequiredQty: { type: DataTypes.DOUBLE, allowNull: false },
      inventoryStatus: {
        type: DataTypes.ENUM("ENOUGH", "SHORTAGE", "WARNING"),
        allowNull: false,
        comment: "Trạng thái tồn kho",
      },
      status: {
        type: DataTypes.ENUM("PLANNING", "COMPLETED"),
        allowNull: false,
        defaultValue: "PLANNING",
      },

      //FK
      planningId: { type: DataTypes.INTEGER, allowNull: false },
    },
    {
      sequelize,
      tableName: "paper_requirements",
      timestamps: true,
      indexes: [
        //FK
        { fields: ["planningId"] },
      ],
    },
  );

  return PaperRequirements;
}
