import { DataTypes, Model, Optional, Sequelize } from "sequelize";
import { PlanningBox } from "../planning/planningBox";
import { PlanningPaper } from "../planning/planningPaper";

//định nghĩa trường trong bảng
interface InboundHistoryAttributes {
  inboundId: number;
  dateInbound: Date;
  inboundQty: number;
  createdAt?: Date;
  updatedAt?: Date;

  //FK
  planningId: number;
  planningBoxId: number;

  PlanningBox?: PlanningBox;
  PlanningPaper?: PlanningPaper;
}

//cho phép bỏ qua id khi tạo
type InboundHistoryCreationAttributes = Optional<
  InboundHistoryAttributes,
  "inboundId" | "createdAt" | "updatedAt"
>;

//định nghĩa kiểu OOP
export class InboundHistory
  extends Model<InboundHistoryAttributes, InboundHistoryCreationAttributes>
  implements InboundHistoryAttributes
{
  declare inboundId: number;
  declare dateInbound: Date;
  declare inboundQty: number;
  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;

  //FK
  declare planningId: number;
  declare planningBoxId: number;

  declare PlanningBox?: PlanningBox;
  declare PlanningPaper?: PlanningPaper;
}

export function initInboundHistoryModel(sequelize: Sequelize): typeof InboundHistory {
  InboundHistory.init(
    {
      inboundId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      dateInbound: { type: DataTypes.DATE, allowNull: false },
      inboundQty: { type: DataTypes.INTEGER, allowNull: false },

      //FK
      planningId: { type: DataTypes.INTEGER },
      planningBoxId: { type: DataTypes.INTEGER },
    },
    { sequelize, tableName: "InboundHistory", timestamps: true }
  );

  return InboundHistory;
}
