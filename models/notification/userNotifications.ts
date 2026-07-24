import { DataTypes, Model, Optional, Sequelize } from "sequelize";
import { NotificationModel } from "./notification";

//định nghĩa trường trong bảng
interface UserNotificationsAttributes {
  userNotifyId: number;
  receiverId: number; //người nhận
  receiverDept?: string | null; //bộ phận người nhận
  isRead: boolean;

  //FK
  notificationId: number;

  createdAt?: Date;
  updatedAt?: Date;
}

//cho phép bỏ qua id khi tạo
export type UserNotificationsCreationAttributes = Optional<
  UserNotificationsAttributes,
  "userNotifyId" | "isRead" | "createdAt" | "updatedAt"
>;

//định nghĩa kiểu OOP
export class UserNotifications
  extends Model<UserNotificationsAttributes, UserNotificationsCreationAttributes>
  implements UserNotificationsAttributes
{
  declare userNotifyId: number;
  declare receiverId: number; //người nhận
  declare receiverDept?: string | null; //bộ phận người nhận
  declare isRead: boolean;

  //FK
  declare notificationId: number;
  declare NotificationModel?: NotificationModel;

  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;
}

export function initUserNotificationsModel(sequelize: Sequelize): typeof UserNotifications {
  UserNotifications.init(
    {
      userNotifyId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      receiverId: { type: DataTypes.INTEGER, allowNull: false }, //người nhận
      receiverDept: { type: DataTypes.STRING }, //bộ phận người nhận
      isRead: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },

      //FK
      notificationId: { type: DataTypes.INTEGER, allowNull: false },
    },
    {
      sequelize,
      tableName: "notifications_user",
      timestamps: true,
      indexes: [{ fields: ["notificationId"] }, { fields: ["createdAt"] }],
    },
  );

  return UserNotifications;
}
