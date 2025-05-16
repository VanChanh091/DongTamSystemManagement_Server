import db from "../firebase.js";

const sendNotification = async ({
  title,
  message,
  targetUserId = "all",
  data = {},
}) => {
  try {
    const notification = {
      title,
      message,
      targetUserId,
      data,
      read: false,
      timestamp: new Date(),
    };

    await db.collection("notifications").add(notification);
    console.log("📢 Notification sent:", title);
  } catch (error) {
    console.error("❌ Failed to send notification:", error.message);
  }
};

const markAsRead = async (notificationId) => {
  try {
    const ref = db.collection("notifications").doc(notificationId);
    await ref.update({ read: true });
    console.log("📘 Notification marked as read:", notificationId);
  } catch (error) {
    console.error("❌ Failed to mark as read:", error.message);
  }
};

const deleteNotification = async (notificationId) => {
  try {
    await db.collection("notifications").doc(notificationId).delete();
    console.log("🗑️ Notification deleted:", notificationId);
  } catch (error) {
    console.error("❌ Failed to delete notification:", error.message);
  }
};

const deleteOldNotifications = async (days = 30) => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  try {
    const snapshot = await db
      .collection("notifications")
      .where("timestamp", "<", cutoffDate)
      .get();

    const batch = db.batch();
    snapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`🧹 Deleted ${snapshot.size} old notifications`);
  } catch (error) {
    console.error("❌ Failed to delete old notifications:", error.message);
  }
};

export {
  sendNotification,
  markAsRead,
  deleteNotification,
  deleteOldNotifications,
};
