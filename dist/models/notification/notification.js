"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationModel = void 0;
exports.initNotificationModel = initNotificationModel;
const sequelize_1 = require("sequelize");
//định nghĩa kiểu OOP
class NotificationModel extends sequelize_1.Model {
}
exports.NotificationModel = NotificationModel;
function initNotificationModel(sequelize) {
    NotificationModel.init({
        notificationId: { type: sequelize_1.DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        title: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        type: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        targetType: {
            type: sequelize_1.DataTypes.ENUM("user", "department", "role", "all"),
            allowNull: false,
            defaultValue: "user",
        },
        senderId: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
        senderName: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        senderDept: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        payload: { type: sequelize_1.DataTypes.JSON, allowNull: false },
        createdAt: {
            type: sequelize_1.DataTypes.DATE,
            get() {
                const rawValue = this.getDataValue("createdAt");
                if (!rawValue)
                    return null;
                return new Date(rawValue.getTime() - rawValue.getTimezoneOffset() * 60000).toISOString();
            },
        },
    }, {
        sequelize,
        tableName: "notifications",
        timestamps: true,
    });
    return NotificationModel;
}
//# sourceMappingURL=notification.js.map