"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserNotifications = void 0;
exports.initUserNotificationsModel = initUserNotificationsModel;
const sequelize_1 = require("sequelize");
//định nghĩa kiểu OOP
class UserNotifications extends sequelize_1.Model {
}
exports.UserNotifications = UserNotifications;
function initUserNotificationsModel(sequelize) {
    UserNotifications.init({
        userNotifyId: { type: sequelize_1.DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        receiverId: { type: sequelize_1.DataTypes.INTEGER, allowNull: false }, //người nhận
        receiverDept: { type: sequelize_1.DataTypes.STRING }, //bộ phận người nhận
        isRead: { type: sequelize_1.DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        //FK
        notificationId: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    }, {
        sequelize,
        tableName: "notifications_user",
        timestamps: true,
        indexes: [{ fields: ["notificationId"] }, { fields: ["createdAt"] }],
    });
    return UserNotifications;
}
//# sourceMappingURL=userNotifications.js.map