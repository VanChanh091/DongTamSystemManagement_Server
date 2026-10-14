"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inspectionQueue = void 0;
exports.scheduleInspectionTimers = scheduleInspectionTimers;
exports.cancelInspectionTimers = cancelInspectionTimers;
const bullmq_1 = require("bullmq");
const redis_connect_1 = require("../connect/redis.connect");
exports.inspectionQueue = new bullmq_1.Queue("INSPECTION_TIMER_QUEUE", {
    connection: redis_connect_1.redisConfig,
});
// Hàm tạo 2 mốc đếm giờ: 3 phút (nhắc nhở) và 5 phút (hết hạn)
async function scheduleInspectionTimers(inspectionId) {
    const payload = { inspectionId };
    // Nhắc nhở sau 3 phút
    await exports.inspectionQueue.add("REMIND_QC", payload, {
        delay: 3 * 60 * 1000,
        jobId: `remind_${inspectionId}`,
        removeOnComplete: true,
        removeOnFail: true,
    });
}
// Hàm hủy bộ đếm giờ khi QC đã tới kiểm hoặc Sản xuất tự hủy
async function cancelInspectionTimers(requestId) {
    const remindJob = await exports.inspectionQueue.getJob(`remind_${requestId}`);
    if (remindJob)
        await remindJob.remove();
}
//# sourceMappingURL=inspection.queue.js.map