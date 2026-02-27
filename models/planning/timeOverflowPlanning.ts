import { DataTypes, Model, Optional, Sequelize } from "sequelize";
import { PlanningPaper } from "./planningPaper";
import { PlanningBox } from "./planningBox";

//định nghĩa trường trong bảng
interface TimeOverflowPlanningAttributes {
  overflowId: number;
  overflowDayStart?: Date | null;
  overflowDayCompleted?: Date | null;
  overflowTimeRunning?: string | null;
  machine?: string | null;

  status: "planning" | "lackOfQty" | "complete";

  createdAt?: Date;
  updatedAt?: Date;

  //FK
  planningId?: number;
  planningBoxId?: number;
}

//cho phép bỏ qua id khi tạo
export type TimeOverflowPlanningCreationAttributes = Optional<
  TimeOverflowPlanningAttributes,
  | "overflowId"
  | "overflowDayStart"
  | "overflowDayCompleted"
  | "overflowTimeRunning"
  | "machine"
  | "status"
  | "createdAt"
  | "updatedAt"
>;

//định nghĩa kiểu OOP
export class timeOverflowPlanning
  extends Model<TimeOverflowPlanningAttributes, TimeOverflowPlanningCreationAttributes>
  implements TimeOverflowPlanningAttributes
{
  declare overflowId: number;
  declare overflowDayStart?: Date | null;
  declare overflowDayCompleted?: Date | null;
  declare overflowTimeRunning?: string | null;
  declare machine?: string | null;
  declare status: "planning" | "lackOfQty" | "complete";
  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;

  //FK
  declare planningId: number;
  declare planningBoxId: number;

  declare PlanningPaper: PlanningPaper;
  declare PlanningBox: PlanningBox;
}

export function initTimeOverflowPlanningModel(sequelize: Sequelize): typeof timeOverflowPlanning {
  timeOverflowPlanning.init(
    {
      overflowId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      overflowDayStart: { type: DataTypes.DATE },
      overflowDayCompleted: {
        type: DataTypes.DATE,
        get() {
          const rawValue = this.getDataValue("overflowDayCompleted");
          if (!rawValue) return null;
          return new Date(rawValue.getTime() - rawValue.getTimezoneOffset() * 60000).toISOString();
        },
      },
      overflowTimeRunning: { type: DataTypes.TIME },
      machine: { type: DataTypes.STRING },
      status: {
        type: DataTypes.ENUM("planning", "lackOfQty", "complete"),
        allowNull: false,
        defaultValue: "planning",
      },

      //FK
      planningId: { type: DataTypes.INTEGER },
      planningBoxId: { type: DataTypes.INTEGER },
    },
    {
      sequelize,
      tableName: "timeOverflowPlannings",
      timestamps: true,
      indexes: [
        //FK
        { fields: ["planningId"] },
        { fields: ["planningBoxId"] },

        //indexes
        { fields: ["overflowDayStart"] },
        { fields: ["overflowTimeRunning"] },
        { fields: ["machine"] },
        { fields: ["planningBoxId", "machine"] },
      ],
    },
  );

  return timeOverflowPlanning;
}
