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
      timestamp: new Date(),
    };

    await db.collection("notifications").add(notification);
    console.log("📢 Notification sent:", title);
  } catch (error) {
    console.error("❌ Failed to send notification:", error.message);
  }
};

export default sendNotification;
