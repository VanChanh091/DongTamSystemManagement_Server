import { Worker, Job } from "bullmq";
import { redisConfig } from "../connect/redis.connect";
import { InspectionRequest } from "../../../models/qualityControl/inspection/inspection_request";
import { PlanningPaper } from "../../../models/planning/planningPaper";
import { getIO } from "../../../utils/socket/socket";

interface InspectionJobData {
  inspectionId: number;
}

export const inspectionWorker = new Worker<InspectionJobData>(
  "INSPECTION_TIMER_QUEUE",
  async (job: Job<InspectionJobData>) => {
    const { inspectionId } = job.data;

    // Kiểm tra trạng thái thực tế trong Database kèm máy sản xuất
    const request = await InspectionRequest.findByPk(inspectionId, {
      include: [{ model: PlanningPaper, attributes: ["chooseMachine"] }],
    });

    // Nếu không còn PENDING (QC đã nhận, đã hủy...), bỏ qua
    if (!request || request.status !== "pending") return;

    // lấy instance của socket
    const io = getIO();
    const machine = (request as any).PlanningPaper?.chooseMachine || "";

    // Job nhắc nhở khi sắp hết hạn (3 phút)
    if (job.name === "REMIND_QC") {
      io.to("department-qc").emit("INSPECTION_REMINDER", {
        inspectionId: request.inspectionId,
        planningId: request.planningId,
        machine,
        remainingSeconds: 120,
        message: `Kế hoạch ${request.planningId} tại ${machine || "máy"} còn 2 phút để tiếp nhận kiểm tra!`,
      });
      return;
    }

    // Job chốt quá hạn (5 phút)
    if (job.name === "TIMEOUT_EXPIRED") {
      await request.update({ result: false });

      io.to("role-lead_qc").emit("QC_LATE_ALARM", {
        inspectionId: request.inspectionId,
        planningId: request.planningId,
        machine,
        requestedAt: request.requestedAt,
        requestedBy: request.requestedBy,
        message: `Cảnh báo: Yêu cầu kiểm kế hoạch ${request.planningId} tại ${machine || "máy"} đã quá 5 phút chưa có QC đến!`,
      });
    }
  },

  {
    connection: redisConfig,
    concurrency: 5, // Cho phép xử lý đồng thời tối đa 5 jobs
  },
);

inspectionWorker.on("completed", (job: Job<InspectionJobData>) => {
  console.log(`[InspectionWorker] Job ${job.id} (${job.name}) hoàn thành thành công.`);
});

inspectionWorker.on("failed", (job: Job<InspectionJobData> | undefined, err: Error) => {
  console.error(
    `[InspectionWorker] ❌ Job ${job?.id} (inspectionId: ${job?.data?.inspectionId}) thất bại:`,
    err,
  );
});
