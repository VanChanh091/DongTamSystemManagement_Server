import { DataTypes, Model, Optional, Sequelize } from "sequelize";
import { Order } from "../order/order";
import { timeOverflowPlanning } from "./timeOverflowPlanning";
import { PlanningBox } from "./planningBox";

export type machinePaperType = "Máy 1350" | "Máy 1900" | "Máy 2 Lớp" | "Máy Quấn Cuồn";
export type planningPaperStatus =
  | "planning"
  | "complete"
  | "lackQty"
  | "producing"
  | "stop"
  | "cancel";
export type statusRequestInbound = "none" | "requested" | "reject" | "complete";

//định nghĩa trường trong bảng
interface PlanningPaperAttributes {
  planningId: number;
  dayStart?: Date | null;
  dayCompleted?: Date | null;
  timeRunning?: string | null;

  dayReplace?: string | null;
  matEReplace?: string | null;
  matBReplace?: string | null;
  matCReplace?: string | null;
  matE2Replace?: string | null;
  songEReplace?: string | null;
  songBReplace?: string | null;
  songCReplace?: string | null;
  songE2Replace?: string | null;

  lengthPaperPlanning: number;
  sizePaperPLaning: number;
  runningPlan: number;
  qtyProduced?: number | null;
  numberChild: number;
  ghepKho?: number | null;
  bottom?: number | null;
  fluteE?: number | null;
  fluteB?: number | null;
  fluteC?: number | null;
  fluteE2?: number | null;
  knife?: number | null;
  totalLoss?: number | null;
  qtyWasteNorm?: number | null;

  chooseMachine: machinePaperType;
  shiftProduction?: string | null;
  shiftManagement?: string | null;
  status: planningPaperStatus;
  statusRequest: statusRequestInbound;
  hasOverFlow?: boolean | null;
  hasBox?: boolean | null;
  sortPlanning?: number | null;

  createdAt?: Date;
  updatedAt?: Date;

  //FK
  orderId: string;
}

//cho phép bỏ qua id khi tạo
type PlanningPaperCreationAttributes = Optional<
  PlanningPaperAttributes,
  | "planningId"
  | "dayStart"
  | "dayCompleted"
  | "timeRunning"
  | "dayReplace"
  | "matEReplace"
  | "matBReplace"
  | "matCReplace"
  | "matE2Replace"
  | "songEReplace"
  | "songBReplace"
  | "songCReplace"
  | "songE2Replace"
  | "qtyProduced"
  | "ghepKho"
  | "bottom"
  | "fluteE"
  | "fluteB"
  | "fluteC"
  | "fluteE2"
  | "knife"
  | "totalLoss"
  | "qtyWasteNorm"
  | "shiftProduction"
  | "shiftManagement"
  | "status"
  | "statusRequest"
  | "hasOverFlow"
  | "hasBox"
  | "sortPlanning"
  | "createdAt"
  | "updatedAt"
>;

//định nghĩa kiểu OOP
export class PlanningPaper
  extends Model<PlanningPaperAttributes, PlanningPaperCreationAttributes>
  implements PlanningPaperAttributes
{
  declare planningId: number;
  declare dayStart?: Date | null;
  declare dayCompleted?: Date | null;
  declare timeRunning?: string | null;
  declare dayReplace?: string | null;
  declare matEReplace?: string | null;
  declare matBReplace?: string | null;
  declare matCReplace?: string | null;
  declare matE2Replace?: string | null;
  declare songEReplace?: string | null;
  declare songBReplace?: string | null;
  declare songCReplace?: string | null;
  declare songE2Replace?: string | null;
  declare lengthPaperPlanning: number;
  declare sizePaperPLaning: number;
  declare runningPlan: number;
  declare qtyProduced?: number | null;
  declare numberChild: number;
  declare ghepKho?: number | null;
  declare bottom?: number | null;
  declare fluteE?: number | null;
  declare fluteB?: number | null;
  declare fluteC?: number | null;
  declare fluteE2?: number | null;
  declare knife?: number | null;
  declare totalLoss?: number | null;
  declare qtyWasteNorm?: number | null;
  declare chooseMachine: machinePaperType;
  declare shiftProduction?: string | null;
  declare shiftManagement?: string | null;
  declare status: planningPaperStatus;
  declare statusRequest: statusRequestInbound;
  declare hasOverFlow?: boolean | null;
  declare hasBox?: boolean | null;
  declare sortPlanning?: number | null;
  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;

  //FK
  declare orderId: string;

  declare Order: Order;
  declare PlanningBox?: PlanningBox;
  declare timeOverFlow?: timeOverflowPlanning;
}

export function initPlanningPaperModel(sequelize: Sequelize): typeof PlanningPaper {
  PlanningPaper.init(
    {
      planningId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      dayStart: { type: DataTypes.DATE },
      dayCompleted: {
        type: DataTypes.DATE,
        get() {
          const rawValue = this.getDataValue("dayCompleted");
          if (!rawValue) return null;
          return new Date(rawValue.getTime() - rawValue.getTimezoneOffset() * 60000).toISOString();
        },
      },
      timeRunning: { type: DataTypes.TIME },
      dayReplace: { type: DataTypes.STRING },
      matEReplace: { type: DataTypes.STRING },
      matBReplace: { type: DataTypes.STRING },
      matCReplace: { type: DataTypes.STRING },
      matE2Replace: { type: DataTypes.STRING },
      songEReplace: { type: DataTypes.STRING },
      songBReplace: { type: DataTypes.STRING },
      songCReplace: { type: DataTypes.STRING },
      songE2Replace: { type: DataTypes.STRING },
      lengthPaperPlanning: { type: DataTypes.DOUBLE, allowNull: false },
      sizePaperPLaning: { type: DataTypes.DOUBLE, allowNull: false },
      runningPlan: { type: DataTypes.INTEGER, allowNull: false },
      qtyProduced: { type: DataTypes.INTEGER },
      numberChild: { type: DataTypes.INTEGER, allowNull: false },
      ghepKho: { type: DataTypes.INTEGER },
      bottom: { type: DataTypes.DOUBLE },
      fluteE: { type: DataTypes.DOUBLE },
      fluteB: { type: DataTypes.DOUBLE },
      fluteC: { type: DataTypes.DOUBLE },
      fluteE2: { type: DataTypes.DOUBLE },
      knife: { type: DataTypes.DOUBLE },
      totalLoss: { type: DataTypes.DOUBLE },
      qtyWasteNorm: { type: DataTypes.DOUBLE },
      chooseMachine: {
        type: DataTypes.ENUM("Máy 1350", "Máy 1900", "Máy 2 Lớp", "Máy Quấn Cuồn"),
        allowNull: false,
      },
      shiftProduction: { type: DataTypes.STRING },
      shiftManagement: { type: DataTypes.STRING },
      status: {
        type: DataTypes.ENUM("planning", "complete", "lackQty", "producing", "stop", "cancel"),
        allowNull: false,
        defaultValue: "planning",
      },
      statusRequest: {
        type: DataTypes.ENUM("none", "requested", "reject", "complete"),
        defaultValue: "none",
      },
      hasOverFlow: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      hasBox: { type: DataTypes.BOOLEAN, defaultValue: false },
      sortPlanning: { type: DataTypes.INTEGER },

      //FK
      orderId: { type: DataTypes.STRING },
    },
    { sequelize, tableName: "Plannings", timestamps: true }
  );

  return PlanningPaper;
}
