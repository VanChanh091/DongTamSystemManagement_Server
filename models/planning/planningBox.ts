import { DataTypes, Model, Optional, Sequelize } from "sequelize";
import { PlanningPaper } from "./planningPaper.js";
import { PlanningBoxTime } from "./planningBoxMachineTime.js";
import { timeOverflowPlanning } from "./timeOverflowPlanning.js";
import { Order } from "../order/order.js";
import { InboundHistory } from "../warehouse/inboundHistory.js";

//định nghĩa trường trong bảng
interface PlanningBoxAttributes {
  planningBoxId: number;
  qtyPaper?: number | null;

  day?: string | null;
  matE?: string | null;
  matB?: string | null;
  matC?: string | null;
  matE2?: string | null;
  songE?: string | null;
  songB?: string | null;
  songC?: string | null;
  songE2?: string | null;

  length: number;
  size: number;

  hasIn?: boolean | null;
  hasCanLan?: boolean | null;
  hasBe?: boolean | null;
  hasXa?: boolean | null;
  hasDan?: boolean | null;
  hasCatKhe?: boolean | null;
  hasCanMang?: boolean | null;
  hasDongGhim?: boolean | null;
  hasOverFlow?: boolean | null;

  createdAt?: Date;
  updatedAt?: Date;

  //FK
  orderId: string;
  planningId: number;
}

//cho phép bỏ qua id khi tạo
type PlanningBoxCreationAttributes = Optional<
  PlanningBoxAttributes,
  | "planningBoxId"
  | "qtyPaper"
  | "day"
  | "matE"
  | "matB"
  | "matC"
  | "matE2"
  | "songE"
  | "songB"
  | "songC"
  | "songE2"
  | "hasIn"
  | "hasCanLan"
  | "hasBe"
  | "hasXa"
  | "hasDan"
  | "hasCatKhe"
  | "hasCanMang"
  | "hasDongGhim"
  | "hasOverFlow"
  | "createdAt"
  | "updatedAt"
>;

//định nghĩa kiểu OOP
export class PlanningBox
  extends Model<PlanningBoxAttributes, PlanningBoxCreationAttributes>
  implements PlanningBoxAttributes
{
  declare planningBoxId: number;
  declare qtyPaper?: number | null;

  declare day?: string | null;
  declare matE?: string | null;
  declare matB?: string | null;
  declare matC?: string | null;
  declare matE2?: string | null;
  declare songE?: string | null;
  declare songB?: string | null;
  declare songC?: string | null;
  declare songE2?: string | null;

  declare length: number;
  declare size: number;

  declare hasIn?: boolean | null;
  declare hasCanLan?: boolean | null;
  declare hasBe?: boolean | null;
  declare hasXa?: boolean | null;
  declare hasDan?: boolean | null;
  declare hasCatKhe?: boolean | null;
  declare hasCanMang?: boolean | null;
  declare hasDongGhim?: boolean | null;

  declare hasOverFlow?: boolean | null;

  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;

  //FK
  declare orderId: string;
  declare planningId: number;

  declare Order: Order;
  declare PlanningPaper: PlanningPaper;

  declare boxTimes?: PlanningBoxTime[];
  declare allBoxTimes?: PlanningBoxTime[];
  declare timeOverFlow?: timeOverflowPlanning[];
  declare InboundHistories?: InboundHistory[];
}

export function initPlanningBoxModel(sequelize: Sequelize): typeof PlanningBox {
  PlanningBox.init(
    {
      planningBoxId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      qtyPaper: { type: DataTypes.INTEGER },

      day: { type: DataTypes.STRING },
      matE: { type: DataTypes.STRING },
      matB: { type: DataTypes.STRING },
      matC: { type: DataTypes.STRING },
      matE2: { type: DataTypes.STRING },
      songE: { type: DataTypes.STRING },
      songB: { type: DataTypes.STRING },
      songC: { type: DataTypes.STRING },
      songE2: { type: DataTypes.STRING },
      length: { type: DataTypes.DOUBLE, allowNull: false },
      size: { type: DataTypes.DOUBLE, allowNull: false },

      hasIn: { type: DataTypes.BOOLEAN, defaultValue: false },
      hasCanLan: { type: DataTypes.BOOLEAN, defaultValue: false },
      hasBe: { type: DataTypes.BOOLEAN, defaultValue: false },
      hasXa: { type: DataTypes.BOOLEAN, defaultValue: false },
      hasDan: { type: DataTypes.BOOLEAN, defaultValue: false },
      hasCatKhe: { type: DataTypes.BOOLEAN, defaultValue: false },
      hasCanMang: { type: DataTypes.BOOLEAN, defaultValue: false },
      hasDongGhim: { type: DataTypes.BOOLEAN, defaultValue: false },

      hasOverFlow: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      orderId: { type: DataTypes.STRING, allowNull: false },
      planningId: { type: DataTypes.INTEGER, allowNull: false },
    },
    { sequelize, tableName: "PlanningBoxes", timestamps: true }
  );

  return PlanningBox;
}
