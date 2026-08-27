import { DataTypes, Model, Optional, Sequelize } from "sequelize";
import { PaperClassifications } from "./paperClassifications";

//định nghĩa trường trong bảng
interface PaperBasisWeightsAttributes {
  basisWeightId: number;
  basisWeight: number;
  weightCode?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

//cho phép bỏ qua id khi tạo
export type PaperBasisWeightsCreationAttributes = Optional<
  PaperBasisWeightsAttributes,
  "basisWeightId" | "createdAt" | "updatedAt"
>;

//định nghĩa kiểu OOP
export class PaperBasisWeights
  extends Model<PaperBasisWeightsAttributes, PaperBasisWeightsCreationAttributes>
  implements PaperBasisWeightsAttributes
{
  declare basisWeightId: number;
  declare basisWeight: number;
  declare weightCode?: string;

  //Association
  declare classifications: PaperClassifications[];

  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;
}

export function initPaperBasisWeightsModel(sequelize: Sequelize): typeof PaperBasisWeights {
  PaperBasisWeights.init(
    {
      basisWeightId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      basisWeight: { type: DataTypes.INTEGER, allowNull: false },
      weightCode: { type: DataTypes.STRING, allowNull: true },
    },
    {
      sequelize,
      tableName: "admin_paper_basis_weights",
      timestamps: true,
    },
  );

  return PaperBasisWeights;
}
