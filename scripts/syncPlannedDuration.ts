import dotenv from "dotenv";
dotenv.config();

import { QueryTypes } from "sequelize";
import { sequelize } from "../assets/configs/connect/database.connect";

interface MachineRow {
  machineId: number;
  machineName: string;
  type: "M2" | "Kg";
  timeChangeSize: number;
  timeChangeSameSize: number;
  speed2Layer: number;
  speed3Layer: number;
  speed4Layer: number;
  speed5Layer: number;
  speed6Layer: number;
  speed7Layer: number;
  paperRollSpeed: number;
  machinePerformance: number;
}

const getSpeed = (flute: string, machine: string, info: MachineRow): number => {
  const layer = parseInt(flute && flute[0] ? flute[0] : "0", 10);
  if (machine === "Máy 2 Lớp") return info.speed2Layer || 100;
  if (machine === "Máy Quấn Cuồn") return info.paperRollSpeed || 80;
  const key = `speed${layer}Layer` as keyof MachineRow;
  return (info[key] as number) || info.speed3Layer || 100;
};

export async function runSyncPlannedDuration() {
  const startTime = Date.now();
  console.log("🚀 Bắt đầu quá trình đồng bộ plannedDuration lên MySQL...");

  try {
    await sequelize.authenticate();
    console.log("✅ Kết nối MySQL thành công!");

    // 1. Nạp danh sách máy vào bộ nhớ
    const machines = await sequelize.query<MachineRow>(`SELECT * FROM machine_papers;`, {
      type: QueryTypes.SELECT,
    });

    const machineMap: Record<string, { m2?: MachineRow; kg?: MachineRow }> = {};
    for (const m of machines) {
      if (!machineMap[m.machineName]) machineMap[m.machineName] = {};
      if (m.type === "M2") machineMap[m.machineName].m2 = m;
      if (m.type === "Kg") machineMap[m.machineName].kg = m;
    }

    // 2. Lấy tất cả planning chưa có plannedDuration
    const plannings = await sequelize.query<{
      planningId: number;
      chooseMachine: string;
      runningPlan: number;
      lengthPaperPlanning: number;
      flute: string;
      numberChild: number;
      dvt: string;
    }>(
      `
      SELECT 
        p.planningId, p.chooseMachine, p.runningPlan, p.lengthPaperPlanning,
        o.flute, o.numberChild, o.dvt
      FROM planning_papers p
      LEFT JOIN orders o ON p.orderId = o.orderId
      WHERE p.plannedDuration IS NULL;
      `,
      { type: QueryTypes.SELECT },
    );

    console.log(`📊 Tìm thấy ${plannings.length} bản ghi cần tính toán...`);
    if (plannings.length === 0) {
      console.log("🎉 Toàn bộ bản ghi đã có plannedDuration, không cần đồng bộ.");
      return;
    }

    // 3. Tính toán plannedDuration
    const updates: { id: number; duration: number }[] = [];

    for (const p of plannings) {
      const dvt = p.dvt || "M2";
      const isKgOrCuon = dvt === "Kg" || dvt === "Cuộn";
      const isCuon = dvt === "Cuộn";
      const mConfig = machineMap[p.chooseMachine] || {};
      const activeMachine = isKgOrCuon ? mConfig.kg || mConfig.m2 : mConfig.m2 || mConfig.kg;

      let productionMinutes = 0;
      if (activeMachine) {
        const lengthPaper = (p.lengthPaperPlanning || 0) / 100;
        const numberChild = p.numberChild || 1;
        let totalLength = 0;

        if (isKgOrCuon) {
          totalLength = isCuon ? p.runningPlan * 12 : p.runningPlan;
        } else {
          totalLength = (p.runningPlan * lengthPaper) / numberChild;
        }

        const speed = getSpeed(p.flute || "3B", p.chooseMachine, activeMachine);
        const perf = activeMachine.machinePerformance || 80;
        const changeTime = activeMachine.timeChangeSameSize || activeMachine.timeChangeSize || 10;

        productionMinutes = Math.ceil((changeTime + totalLength / speed) / (perf / 100));
      } else {
        // Fallback mặc định nếu không khớp máy
        productionMinutes = 60;
      }

      if (productionMinutes <= 0) productionMinutes = 10;
      updates.push({ id: p.planningId, duration: productionMinutes });
    }

    // 4. Batch update 500 bản ghi/lần
    const BATCH_SIZE = 500;
    let updatedCount = 0;

    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
      const batch = updates.slice(i, i + BATCH_SIZE);
      const ids = batch.map((b) => b.id).join(",");
      const cases = batch.map((b) => `WHEN ${b.id} THEN ${b.duration}`).join(" ");

      await sequelize.query(`
        UPDATE planning_papers
        SET plannedDuration = CASE planningId
          ${cases}
        END
        WHERE planningId IN (${ids});
      `);

      updatedCount += batch.length;
      process.stdout.write(`Đang cập nhật: ${updatedCount}/${updates.length} bản ghi...\r`);
    }

    const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(
      `\n🎉 Hoàn tất đồng bộ ${updatedCount} bản ghi plannedDuration trong ${durationSec}s!`,
    );
  } catch (error) {
    console.error("❌ Lỗi khi đồng bộ plannedDuration:", error);
    throw error;
  }
}

if (require.main === module) {
  runSyncPlannedDuration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
