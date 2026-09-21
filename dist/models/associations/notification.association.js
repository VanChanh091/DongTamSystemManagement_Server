"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = notificationAssociations;
function notificationAssociations(models) {
    const { NotificationModel, UserNotifications } = models;
    // NOTIFICATION
    NotificationModel.hasMany(UserNotifications, {
        foreignKey: "notificationId",
        onDelete: "CASCADE",
        as: "userNotify",
    });
    UserNotifications.belongsTo(NotificationModel, {
        foreignKey: "notificationId",
        as: "notification",
    });
}
//# sourceMappingURL=notification.association.js.map