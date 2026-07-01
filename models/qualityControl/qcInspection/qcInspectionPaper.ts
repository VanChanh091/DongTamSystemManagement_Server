import { DataTypes, Model, Optional, Sequelize } from "sequelize";
import { PlanningPaper } from "../../planning/planningPaper";

export type qcCheckPaper = Record<string, boolean>;

//định nghĩa trường trong bảng
interface QcInspectionPaperAttributes {
  inspecPaperId: number;
  timeInspection: Date;

  numberPallet: number;
  machineSpeed: number;
  moisture: number;
  steamPressure: number;
  preheaterTemp: number;
  fctValue: number;
  patValue: number;
  checkList: qcCheckPaper;
  checkedBy: string;

  createdAt?: Date;
  updatedAt?: Date;

  //FK
  planningId: number;
}

//cho phép bỏ qua id khi tạo
export type QcInspectionPaperCreationAttributes = Optional<
  QcInspectionPaperAttributes,
  "inspecPaperId" | "timeInspection" | "checkedBy" | "planningId" | "createdAt" | "updatedAt"
>;

//định nghĩa kiểu OOP
export class QcInspectionPaper
  extends Model<QcInspectionPaperAttributes, QcInspectionPaperCreationAttributes>
  implements QcInspectionPaperAttributes
{
  declare inspecPaperId: number;
  declare timeInspection: Date;

  declare numberPallet: number;
  declare machineSpeed: number;
  declare moisture: number;
  declare steamPressure: number;
  declare preheaterTemp: number;
  declare fctValue: number;
  declare patValue: number;

  declare checkList: qcCheckPaper;
  declare checkedBy: string;

  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;

  //FK
  declare planningId: number;
  declare PlanningPaper: PlanningPaper;
}

export function initQcInspectionPaperModel(sequelize: Sequelize): typeof QcInspectionPaper {
  QcInspectionPaper.init(
    {
      inspecPaperId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      timeInspection: {
        type: DataTypes.DATE,
        allowNull: false,
        get() {
          const rawValue = this.getDataValue("timeInspection");
          if (!rawValue) return null;
          return new Date(rawValue.getTime() - rawValue.getTimezoneOffset() * 60000).toISOString();
        },
      },

      //user input
      numberPallet: { type: DataTypes.INTEGER },
      machineSpeed: { type: DataTypes.INTEGER, allowNull: false },
      moisture: { type: DataTypes.DOUBLE, allowNull: false }, //độ ẩm
      steamPressure: { type: DataTypes.DOUBLE, allowNull: false }, //áp suất hơi
      preheaterTemp: { type: DataTypes.DOUBLE, allowNull: false }, //nhiệt độ đầu sóng
      fctValue: { type: DataTypes.DOUBLE, allowNull: false }, //giá trị FCT
      patValue: { type: DataTypes.DOUBLE, allowNull: false }, //giá trị PAT

      checkList: { type: DataTypes.JSON, allowNull: false }, //danh sách kiểm tra
      checkedBy: { type: DataTypes.STRING, allowNull: false }, //người kiểm tra

      //FK
      planningId: { type: DataTypes.INTEGER },
    },
    {
      sequelize,
      tableName: "QcInspectionPaper",
      timestamps: true,
      indexes: [
        //FK
        { fields: ["planningId"] },
      ],
    },
  );

  return QcInspectionPaper;
}
