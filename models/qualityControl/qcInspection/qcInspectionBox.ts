import { DataTypes, Model, Optional, Sequelize } from "sequelize";
import { PlanningBoxTime } from "../../planning/planningBoxMachineTime";

export type qcCheckBox = Record<string, boolean>;

//định nghĩa trường trong bảng
interface QcInspectionBoxAttributes {
  inspecBoxId: number;
  timeInspection: Date;
  checkList: qcCheckBox;
  checkedBy: string;

  createdAt?: Date;
  updatedAt?: Date;

  //FK
  boxtimeId: number;
}

//cho phép bỏ qua id khi tạo
export type QcInspectionBoxCreationAttributes = Optional<
  QcInspectionBoxAttributes,
  "inspecBoxId" | "timeInspection" | "checkedBy" | "boxtimeId" | "createdAt" | "updatedAt"
>;

//định nghĩa kiểu OOP
export class QcInspectionBox
  extends Model<QcInspectionBoxAttributes, QcInspectionBoxCreationAttributes>
  implements QcInspectionBoxAttributes
{
  declare inspecBoxId: number;
  declare timeInspection: Date;
  declare checkList: qcCheckBox;
  declare checkedBy: string;

  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;

  //FK
  declare boxtimeId: number;
  declare boxTimes: PlanningBoxTime;
}

export function initQcInspectionBoxModel(sequelize: Sequelize): typeof QcInspectionBox {
  QcInspectionBox.init(
    {
      inspecBoxId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      timeInspection: {
        type: DataTypes.DATE,
        allowNull: false,
        get() {
          const rawValue = this.getDataValue("timeInspection");
          if (!rawValue) return null;
          return new Date(rawValue.getTime() - rawValue.getTimezoneOffset() * 60000).toISOString();
        },
      },
      checkList: { type: DataTypes.JSON, allowNull: false }, //danh sách kiểm tra
      checkedBy: { type: DataTypes.STRING, allowNull: false }, //người kiểm tra

      //FK
      boxtimeId: { type: DataTypes.INTEGER },
    },
    {
      sequelize,
      tableName: "QcInspectionBox",
      timestamps: true,
      indexes: [
        //FK
        { fields: ["boxtimeId"] },
      ],
    },
  );

  return QcInspectionBox;
}
