import { User } from "../user/user";
import { DataTypes, Model, Optional, Sequelize } from "sequelize";

//định nghĩa trường trong bảng
interface QcSihftAttributes {
  qcShiftId: number;
  username: string;
  startedAt: Date;
  endedAt?: Date;
  isActive: boolean;

  //FK
  userId: number;

  createdAt?: Date;
  updatedAt?: Date;
}

//cho phép bỏ qua id khi tạo
export type QcSihftCreationAttributes = Optional<
  QcSihftAttributes,
  "qcShiftId" | "isActive" | "endedAt" | "createdAt" | "updatedAt"
>;

//định nghĩa kiểu OOP
export class QcShift
  extends Model<QcSihftAttributes, QcSihftCreationAttributes>
  implements QcSihftAttributes
{
  declare qcShiftId: number;
  declare username: string;
  declare startedAt: Date;
  declare endedAt?: Date;
  declare isActive: boolean;

  //FK
  declare userId: number;
  declare User: User;

  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;
}

export function initQcShiftModel(sequelize: Sequelize): typeof QcShift {
  QcShift.init(
    {
      qcShiftId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      username: { type: DataTypes.STRING, allowNull: false },
      startedAt: { type: DataTypes.DATE, allowNull: false },
      endedAt: { type: DataTypes.DATE },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },

      //FK
      userId: { type: DataTypes.INTEGER, allowNull: false },
    },
    {
      sequelize,
      tableName: "qc_shifts",
      timestamps: true,
      indexes: [{ fields: ["userId"] }, { fields: ["isActive", "userId"] }],
    },
  );

  return QcShift;
}
