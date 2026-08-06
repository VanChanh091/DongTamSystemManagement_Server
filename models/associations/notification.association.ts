export default function notificationAssociations(models: any) {
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
