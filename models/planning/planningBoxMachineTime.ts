import { DataTypes, Model, Optional, Sequelize } from "sequelize";
import { PlanningBox } from "./planningBox";

//định nghĩa trường trong bảng
interface PlanningBoxTimeAttributes {
  boxTimeId: number;
  runningPlan?: number | null;
  timeRunning?: string | null;
  dayStart?: Date | null;
  dayCompleted?: Date | null;
  wasteBox?: number | null;
  rpWasteLoss?: number | null;
  qtyProduced?: number | null;
  machine:
    | "Máy In"
    | "Máy Cấn Lằn"
    | "Máy Bế"
    | "Máy Xả"
    | "Máy Dán"
    | "Máy Cắt Khe"
    | "Máy Cán Màng"
    | "Máy Đóng Ghim";
  shiftManagement?: string | null;
  status: "planning" | "lackOfQty" | "complete" | "producing" | "stop";
  sortPlanning?: number | null;
  createdAt?: Date;
  updatedAt?: Date;

  //FK
  planningBoxId: number;
}

//cho phép bỏ qua id khi tạo
type PlanningBoxTimeCreationAttributes = Optional<
  PlanningBoxTimeAttributes,
  | "boxTimeId"
  | "runningPlan"
  | "timeRunning"
  | "dayStart"
  | "dayCompleted"
  | "wasteBox"
  | "rpWasteLoss"
  | "qtyProduced"
  | "shiftManagement"
  | "sortPlanning"
  | "createdAt"
  | "updatedAt"
>;

//định nghĩa kiểu OOP
export class PlanningBoxTime
  extends Model<PlanningBoxTimeAttributes, PlanningBoxTimeCreationAttributes>
  implements PlanningBoxTimeAttributes
{
  declare boxTimeId: number;
  declare runningPlan?: number | null;
  declare timeRunning?: string | null;
  declare dayStart?: Date | null;
  declare dayCompleted?: Date | null;
  declare wasteBox?: number | null;
  declare rpWasteLoss?: number | null;
  declare qtyProduced?: number | null;
  declare machine:
    | "Máy In"
    | "Máy Cấn Lằn"
    | "Máy Bế"
    | "Máy Xả"
    | "Máy Dán"
    | "Máy Cắt Khe"
    | "Máy Cán Màng"
    | "Máy Đóng Ghim";
  declare shiftManagement?: string | null;
  declare status: "planning" | "lackOfQty" | "complete" | "producing" | "stop";
  declare sortPlanning?: number | null;
  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;

  //FK
  declare planningBoxId: number;
  declare PlanningBox: PlanningBox;
}

//tạo table
export function initPlanningBoxTimeModel(sequelize: Sequelize): typeof PlanningBoxTime {
  PlanningBoxTime.init(
    {
      boxTimeId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      runningPlan: { type: DataTypes.INTEGER },
      timeRunning: { type: DataTypes.TIME },
      dayStart: { type: DataTypes.DATE },
      dayCompleted: {
        type: DataTypes.DATE,
        get() {
          const rawValue = this.getDataValue("dayCompleted");
          if (!rawValue) return null;
          return new Date(rawValue.getTime() - rawValue.getTimezoneOffset() * 60000).toISOString();
        },
      },
      wasteBox: { type: DataTypes.DOUBLE },
      rpWasteLoss: { type: DataTypes.DOUBLE },
      qtyProduced: { type: DataTypes.INTEGER },
      machine: {
        type: DataTypes.ENUM(
          "Máy In",
          "Máy Cấn Lằn",
          "Máy Bế",
          "Máy Xả",
          "Máy Dán",
          "Máy Cắt Khe",
          "Máy Cán Màng",
          "Máy Đóng Ghim"
        ),
        allowNull: false,
      },
      shiftManagement: { type: DataTypes.STRING },
      status: {
        type: DataTypes.ENUM("planning", "lackOfQty", "complete", "producing", "stop"),
        allowNull: false,
        defaultValue: "planning",
      },
      sortPlanning: { type: DataTypes.INTEGER },

      //FK
      planningBoxId: { type: DataTypes.INTEGER, allowNull: false },
    },
    { sequelize, tableName: "PlanningBoxTimes", timestamps: true }
  );

  return PlanningBoxTime;
}
