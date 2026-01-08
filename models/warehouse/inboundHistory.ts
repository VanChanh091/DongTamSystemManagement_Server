import { DataTypes, Model, Optional, Sequelize } from "sequelize";
import { Order } from "../order/order";
import { QcSession } from "../qualityControl/qcSession";
import { PlanningPaper } from "../planning/planningPaper";
import { PlanningBox } from "../planning/planningBox";

//định nghĩa trường trong bảng
interface InboundHistoryAttributes {
  inboundId: number;
  dateInbound: Date;
  qtyPaper: number;
  qtyInbound: number;
  createdAt?: Date;
  updatedAt?: Date;

  //FK
  orderId: string;
  planningId: number;
  planningBoxId: number;
  qcSessionId: number;
}

//cho phép bỏ qua id khi tạo
export type InboundHistoryCreationAttributes = Optional<
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
  declare qtyPaper: number;
  declare qtyInbound: number;
  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;

  //FK
  declare orderId: string;
  declare Order: Order;

  declare planningId: number;
  declare planningBoxId: number;
  declare Planning: PlanningPaper;
  declare PlanningBox: PlanningBox;

  declare qcSessionId: number;
  declare QcSession: QcSession;
}

export function initInboundHistoryModel(sequelize: Sequelize): typeof InboundHistory {
  InboundHistory.init(
    {
      inboundId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      dateInbound: { type: DataTypes.DATE, allowNull: false },
      qtyPaper: { type: DataTypes.INTEGER, allowNull: false },
      qtyInbound: { type: DataTypes.INTEGER, allowNull: false },

      //FK
      orderId: { type: DataTypes.STRING, allowNull: false },
      planningId: { type: DataTypes.INTEGER },
      planningBoxId: { type: DataTypes.INTEGER },
      qcSessionId: { type: DataTypes.INTEGER, allowNull: false },
    },
    {
      sequelize,
      tableName: "InboundHistory",
      timestamps: true,
      indexes: [{ fields: ["orderId"] }],
    }
  );

  return InboundHistory;
}
