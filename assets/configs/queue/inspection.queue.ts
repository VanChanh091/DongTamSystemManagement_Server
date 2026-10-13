import { Queue } from "bullmq";
import { redisConfig } from "../connect/redis.connect";

export const inspectionQueue = new Queue<{
  inspectionId: number;
}>("INSPECTION_TIMER_QUEUE", {
  connection: redisConfig,
});

// Hàm tạo 2 mốc đếm giờ: 3 phút (nhắc nhở) và 5 phút (hết hạn)
export async function scheduleInspectionTimers(inspectionId: number) {
  const payload = { inspectionId };

  // Nhắc nhở sau 3 phút
  await inspectionQueue.add("REMIND_QC", payload, {
    delay: 3 * 60 * 1000,
    jobId: `remind_${inspectionId}`,
    removeOnComplete: true,
    removeOnFail: true,
  });
}

// Hàm hủy bộ đếm giờ khi QC đã tới kiểm hoặc Sản xuất tự hủy
export async function cancelInspectionTimers(requestId: number) {
  const remindJob = await inspectionQueue.getJob(`remind_${requestId}`);
  if (remindJob) await remindJob.remove();
}
