import { DataTypes, Model, Optional, Sequelize } from "sequelize";
import { UserNotifications } from "./userNotifications";

export type NotiTargetType = "user" | "department" | "role" | "all";

//định nghĩa trường trong bảng
interface NotificationAttributes {
  notificationId: number;

  title: string;
  type: string;
  targetType: NotiTargetType;

  senderId: number;
  senderName: string;
  senderDept: string;

  payload: object;

  createdAt?: Date;
  updatedAt?: Date;
}

//cho phép bỏ qua id khi tạo
export type NotificationCreationAttributes = Optional<
  NotificationAttributes,
  "notificationId" | "targetType" | "createdAt" | "updatedAt"
>;

//định nghĩa kiểu OOP
export class NotificationModel
  extends Model<NotificationAttributes, NotificationCreationAttributes>
  implements NotificationAttributes
{
  declare notificationId: number;
  declare title: string;
  declare type: string;
  declare targetType: NotiTargetType;

  declare senderId: number;
  declare senderName: string;
  declare senderDept: string;

  declare payload: object;

  //Fk
  declare userNotify?: UserNotifications[];

  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;
}

export function initNotificationModel(sequelize: Sequelize): typeof NotificationModel {
  NotificationModel.init(
    {
      notificationId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

      title: { type: DataTypes.STRING, allowNull: false },
      type: { type: DataTypes.STRING, allowNull: false },
      targetType: {
        type: DataTypes.ENUM("user", "department", "role", "all"),
        allowNull: false,
        defaultValue: "user",
      },

      senderId: { type: DataTypes.INTEGER, allowNull: false },
      senderName: { type: DataTypes.STRING, allowNull: false },
      senderDept: { type: DataTypes.STRING, allowNull: false },

      payload: { type: DataTypes.JSON, allowNull: false },

      createdAt: {
        type: DataTypes.DATE,
        get() {
          const rawValue = this.getDataValue("createdAt");
          if (!rawValue) return null;
          return new Date(rawValue.getTime() - rawValue.getTimezoneOffset() * 60000).toISOString();
        },
      },
    },
    {
      sequelize,
      tableName: "notifications",
      timestamps: true,
    },
  );

  return NotificationModel;
}
