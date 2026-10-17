import dotenv from "dotenv";
dotenv.config();

import { Worker, Job } from "bullmq";
import { User } from "../../../models/user/user";
import { getIO } from "../../../utils/socket/socket";
import { redisConfig } from "../connect/redis.connect";
import { PlanningPaper } from "../../../models/planning/planningPaper";
import { RequestType } from "../../../service/notification/requestType";
import { NotificationModel } from "../../../models/notification/notification";
import { UserNotifications } from "../../../models/notification/userNotifications";
import { InspectionRequest } from "../../../models/qualityControl/inspection/inspection_request";

const devEnvironment = process.env.NODE_ENV !== "production";

interface InspectionJobData {
  inspectionId: number;
}

export const inspectionWorker = new Worker<InspectionJobData>(
  "INSPECTION_TIMER_QUEUE",
  async (job: Job<InspectionJobData>) => {
    const { inspectionId } = job.data;

    // Kiểm tra trạng thái thực tế trong Database kèm máy sản xuất
    const request = await InspectionRequest.findByPk(inspectionId, {
      include: [{ model: PlanningPaper, attributes: ["planningId", "orderId", "chooseMachine"] }],
    });

    // Nếu không còn PENDING (QC đã nhận, đã hủy...), bỏ qua
    if (!request || request.status !== "pending") return;

    // lấy instance của socket
    const io = getIO();
    const machine = (request as any).PlanningPaper?.chooseMachine || "";
    const orderId = (request as any).PlanningPaper?.orderId || "";

    // Job nhắc nhở khi sắp hết hạn (3 phút)
    if (job.name === "REMIND_QC") {
      const reminderMessage = `Đơn hàng: ${orderId} tại ${machine} còn 2 phút để tiếp nhận kiểm tra!`;

      // 1. Phát socket nghiệp vụ chuyên biệt
      io.to("department-qc").emit("INSPECTION_REMINDER", {
        inspectionId: request.inspectionId,
        planningId: request.planningId,
        machine,
        remainingSeconds: 120,
        message: reminderMessage,
      });

      // 2. Tạo Notification trong DB và phát socket 'new-notification' cho Flutter UI
      try {
        const qcUsers = await User.findAll({
          where: { department: "QC" },
          attributes: ["userId", "department"],
        });

        if (qcUsers.length > 0) {
          const newNotif = await NotificationModel.create({
            title: reminderMessage,
            type: RequestType.INSPECTION_REMIND,
            targetType: "department",
            senderId: 0,
            senderName: "Hệ Thống",
            senderDept: "Hệ thống",
            payload: {
              orderId,
              planningId: request.planningId,
              inspectionId: request.inspectionId,
              machine,
              action: "REMIND",
              status: "pending",
              remainingSeconds: 120,
            },
          });

          const userNotifications = qcUsers.map((qcUser) => ({
            notificationId: newNotif.notificationId,
            receiverId: qcUser.userId,
            receiverDept: qcUser.department || "QC",
            isRead: false,
          }));

          await UserNotifications.bulkCreate(userNotifications);

          // Phát socket 'new-notification' tới room 'department-qc' để UI NotificationController nhận diện
          io.to("department-qc").emit("new-notification", {
            ...newNotif.toJSON(),
            isRead: false,
            userNotifyId: 0,
          });
        }
      } catch (err) {
        console.error("❌ Lỗi khi gửi thông báo nhắc nhở QC:", err);
      }
      return;
    }
  },

  {
    connection: redisConfig,
    concurrency: 5, // Cho phép xử lý đồng thời tối đa 5 jobs
  },
);

inspectionWorker.on("completed", (job: Job<InspectionJobData>) => {
  if (devEnvironment)
    console.log(`[InspectionWorker] Job ${job.id} (${job.name}) hoàn thành thành công.`);
});

inspectionWorker.on("failed", (job: Job<InspectionJobData> | undefined, err: Error) => {
  if (devEnvironment)
    console.error(
      `[InspectionWorker] ❌ Job ${job?.id} (inspectionId: ${job?.data?.inspectionId}) thất bại:`,
      err,
    );
});
