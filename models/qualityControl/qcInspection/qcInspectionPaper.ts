import { DataTypes, Model, Optional, Sequelize } from "sequelize";
import { PlanningPaper } from "../../planning/planningPaper";
import { User } from "../../user/user";

export type qcCheckPaper = Record<string, boolean>;

//định nghĩa trường trong bảng
interface QcInspectionPaperAttributes {
  inspecPaperId: number;
  timeInspection: Date;

  moisture: number;
  steamPressure: number;
  preheaterTemp: number;
  fctValue: number;
  patValue: number;
  checkList: qcCheckPaper;
  checkedBy: string;

  note?: string;
  result: boolean;
  imgError?: string;

  createdAt?: Date;
  updatedAt?: Date;

  //FK
  planningId: number;
  userId?: number;
}

//cho phép bỏ qua id khi tạo
export type QcInspectionPaperCreationAttributes = Optional<
  QcInspectionPaperAttributes,
  | "inspecPaperId"
  | "timeInspection"
  | "checkedBy"
  | "note"
  | "result"
  | "imgError"
  | "planningId"
  | "userId"
  | "createdAt"
  | "updatedAt"
>;

//định nghĩa kiểu OOP
export class QcInspectionPaper
  extends Model<QcInspectionPaperAttributes, QcInspectionPaperCreationAttributes>
  implements QcInspectionPaperAttributes
{
  declare inspecPaperId: number;
  declare timeInspection: Date;

  declare moisture: number;
  declare steamPressure: number;
  declare preheaterTemp: number;
  declare fctValue: number;
  declare patValue: number;

  declare checkList: qcCheckPaper;
  declare checkedBy: string;

  declare note?: string;
  declare result: boolean;
  declare imgError?: string;

  //FK
  declare planningId: number;
  declare PlanningPaper: PlanningPaper;

  declare userId: number;
  declare User: User;

  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;
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
      moisture: { type: DataTypes.DOUBLE, allowNull: true }, //độ ẩm
      steamPressure: { type: DataTypes.DOUBLE, allowNull: false }, //áp suất hơi
      preheaterTemp: { type: DataTypes.DOUBLE, allowNull: false }, //nhiệt độ đầu sóng
      fctValue: { type: DataTypes.DOUBLE, allowNull: false }, //giá trị FCT
      patValue: { type: DataTypes.DOUBLE, allowNull: false }, //giá trị PAT

      checkList: { type: DataTypes.JSON, allowNull: false }, //danh sách kiểm tra
      checkedBy: { type: DataTypes.STRING, allowNull: false }, //người kiểm tra

      note: { type: DataTypes.STRING }, //ghi chú
      result: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }, //kết quả kiểm tra
      imgError: { type: DataTypes.STRING }, //ảnh lỗi

      //FK
      planningId: { type: DataTypes.INTEGER, allowNull: false },
      userId: { type: DataTypes.INTEGER },
    },
    {
      sequelize,
      tableName: "qc_inspection_papers",
      timestamps: true,
      indexes: [
        //FK
        { fields: ["planningId"] },
        { fields: ["userId"] },

        //composite index
        { fields: ["timeInspection", "planningId"] },
      ],
    },
  );

  return QcInspectionPaper;
}
