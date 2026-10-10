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

  // 1. Nhắc nhở sau 3 phút
  await inspectionQueue.add("REMIND_QC", payload, {
    delay: 3 * 60 * 1000,
    jobId: `remind_${inspectionId}`,
    removeOnComplete: true,
    removeOnFail: true,
  });

  // 2. Chốt hết hạn sau 5 phút
  await inspectionQueue.add("TIMEOUT_EXPIRED", payload, {
    delay: 5 * 60 * 1000,
    jobId: `expire_${inspectionId}`,
    removeOnComplete: true,
    removeOnFail: true,
  });
}

// Hàm hủy bộ đếm giờ khi QC đã tới kiểm hoặc Sản xuất tự hủy
export async function cancelInspectionTimers(requestId: number) {
  const remindJob = await inspectionQueue.getJob(`remind_${requestId}`);
  if (remindJob) await remindJob.remove();

  const expireJob = await inspectionQueue.getJob(`expire_${requestId}`);
  if (expireJob) await expireJob.remove();
}
