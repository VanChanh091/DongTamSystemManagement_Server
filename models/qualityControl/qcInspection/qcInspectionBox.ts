import { DataTypes, Model, Optional, Sequelize } from "sequelize";
import { PlanningBoxTime } from "../../planning/planningBoxMachineTime";
import { User } from "../../user/user";

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
  boxTimeId: number;
  userId?: number;
}

//cho phép bỏ qua id khi tạo
export type QcInspectionBoxCreationAttributes = Optional<
  QcInspectionBoxAttributes,
  | "inspecBoxId"
  | "timeInspection"
  | "checkedBy"
  | "boxTimeId"
  | "userId"
  | "createdAt"
  | "updatedAt"
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
  declare boxTimeId: number;
  declare PlanningBoxTime: PlanningBoxTime;

  declare userId: number;
  declare User: User;
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
      boxTimeId: { type: DataTypes.INTEGER, allowNull: false },
      userId: { type: DataTypes.INTEGER },
    },
    {
      sequelize,
      tableName: "qc_inspection_boxes",
      timestamps: true,
      indexes: [
        //FK
        { fields: ["boxTimeId"] },
      ],
    },
  );

  return QcInspectionBox;
}
