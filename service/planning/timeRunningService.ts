import { Op } from "sequelize";
import { PlanningPaper } from "../../models/planning/planningPaper";
import { timeOverflowPlanning } from "../../models/planning/timeOverflowPlanning";

export const updateSortPlanning = async (
  updateIndex: { planningId: number; sortPlanning: number | null }[],
  transaction: any
) => {
  const updates = updateIndex
    .filter((item) => item.sortPlanning)
    .map((item) =>
      PlanningPaper.update(
        { sortPlanning: item.sortPlanning },
        {
          where: { planningId: item.planningId, status: { [Op.ne]: "complete" } },
          transaction,
        }
      )
    );
  await Promise.all(updates);
};

export const calculateTimeRunning = async ({
  plannings,
  machineInfo,
  machine,
  dayStart,
  timeStart,
  totalTimeWorking,
  transaction,
}: {
  plannings: any[];
  machineInfo: any;
  machine: string;
  dayStart: string | Date;
  timeStart: string;
  totalTimeWorking: number;
  transaction: any;
}) => {
  const updated = [];
  let currentTime, currentDay, lastGhepKho;

  // ✅ Xác định con trỏ bắt đầu
  const feComplete = plannings
    .filter((p) => p.status === "complete")
    .sort((a, b) => new Date(b.dayStart as any).getTime() - new Date(a.dayStart).getTime())[0];

  if (feComplete) {
    const overflowRecord = feComplete.hasOverFlow
      ? await timeOverflowPlanning.findOne({
          where: { planningId: feComplete.planningId },
          transaction,
        })
      : null;

    if (overflowRecord?.overflowTimeRunning && overflowRecord?.overflowDayStart) {
      // Sử dụng overflow day + time làm con trỏ
      currentDay = new Date(overflowRecord.overflowDayStart);
      currentTime = combineDateAndHHMMSS(currentDay, overflowRecord.overflowTimeRunning);
      lastGhepKho = feComplete.ghepKho ?? null;
    } else if (feComplete.dayStart && feComplete.timeRunning) {
      // fallback: nếu không tìm thấy record overflow trong DB, dùng dayStart/timeRunning từ FE
      currentDay = new Date(feComplete.dayStart);
      currentTime = combineDateAndHHMMSS(currentDay, feComplete.timeRunning);
      lastGhepKho = feComplete.ghepKho ?? null;
    } else {
      // fallback cuối cùng: dùng logic cũ lấy cursor từ DB
      const initCursor = await getInitialCursor({ machine, dayStart, timeStart, transaction });
      ({ currentTime, currentDay, lastGhepKho } = initCursor);
    }
  } else {
    const initCursor = await getInitialCursor({ machine, dayStart, timeStart, transaction });
    ({ currentTime, currentDay, lastGhepKho } = initCursor);
  }

  // ✅ Tính từng đơn
  for (let i = 0; i < plannings.length; i++) {
    const planning = plannings[i];
    if (planning.status === "complete") continue;

    const data = await calculateTimeForOnePlanning({
      planning,
      machine,
      machineInfo,
      currentTime,
      currentDay,
      timeStart,
      totalTimeWorking,
      lastGhepKho,
      transaction,
      isFirst: i === 0,
    });

    currentTime = data.nextTime;
    currentDay = data.nextDay;
    lastGhepKho = data.ghepKho;

    updated.push(data.result);
  }

  return updated;
};

export const calculateTimeForOnePlanning = async ({
  planning,
  machine,
  machineInfo,
  currentTime,
  currentDay,
  timeStart,
  totalTimeWorking,
  lastGhepKho,
  transaction,
  isFirst,
}: {
  planning: {
    planningId: number;
    runningPlan: number;
    ghepKho?: number | null;
    Order?: {
      numberChild?: number | null;
      flute?: string | null;
    } | null;
    status?: string;
  };
  machine: string;
  machineInfo: any;
  currentTime: Date;
  currentDay: Date;
  timeStart: string;
  totalTimeWorking: number;
  lastGhepKho: number | null;
  transaction: any;
  isFirst: boolean;
}) => {
  const { planningId, runningPlan, ghepKho, Order } = planning;
  const numberChild = Order?.numberChild || 1;
  const flute = Order?.flute || "3B";
  const speed = getSpeed(flute, machine, machineInfo);
  const performance = machineInfo.machinePerformance;
  const totalLength = runningPlan / numberChild;

  const isSameSize = lastGhepKho && ghepKho === lastGhepKho;

  const changeTime =
    machine === "Máy Quấn Cuồn"
      ? machineInfo.timeChangeSize
      : isFirst
      ? machineInfo.timeChangeSize
      : isSameSize
      ? machineInfo.timeChangeSameSize
      : machineInfo.timeChangeSize;

  //công thức
  const productionMinutes = Math.ceil((changeTime + totalLength / speed) / (performance / 100));

  // Tính thời gian bắt đầu và kết thúc ca làm việc cho currentDay
  const [h, m] = timeStart.split(":").map(Number);

  let startOfWork = new Date(currentDay);
  startOfWork.setHours(h, m, 0, 0);

  let endOfWork = new Date(startOfWork);
  endOfWork.setHours(startOfWork.getHours() + totalTimeWorking);

  // Nếu currentTime < start → set currentTime = start
  if (currentTime < startOfWork) {
    currentTime = new Date(startOfWork);
  }

  // Nếu currentTime >= end → nhảy sang hôm sau
  if (currentTime >= endOfWork) {
    currentDay.setDate(currentDay.getDate() + 1);
    startOfWork.setDate(startOfWork.getDate() + 1);
    endOfWork.setDate(endOfWork.getDate() + 1);
    currentTime = new Date(startOfWork);
  }

  let endTime = new Date(currentTime);
  endTime.setMinutes(endTime.getMinutes() + productionMinutes);
  const extraBreak = isDuringBreak(currentTime, endTime);

  const predictedEnd = new Date(currentTime);
  predictedEnd.setMinutes(predictedEnd.getMinutes() + productionMinutes + extraBreak);

  const hasOverFlow = predictedEnd > endOfWork;
  const result = await handleOverflow({
    hasOverFlow,
    predictedEnd,
    endOfWork,
    planningId,
    currentDay,
    timeStart,
    transaction,
  });

  await PlanningPaper.update(
    {
      dayStart: new Date(result.dayStart),
      timeRunning: result.timeRunning,
      hasOverFlow,
    },
    { where: { planningId }, transaction }
  );

  // console.log("🔍 [Tính toán đơn hàng]:", {
  //   planningId,
  //   status: planning.status,
  //   lastGhepKho,
  //   isSameSize,
  //   changeTime: `${changeTime} phút`,
  //   productionTime: `${productionMinutes} phút`,
  //   breakTime: `${extraBreak} phút`,
  //   predictedEndTime: formatTime(predictedEnd),
  //   endOfWorkTime: formatTime(endOfWork),
  //   hasOverFlow,
  //   overflowDayStart: hasOverFlow ? result.overflowDayStart : null,
  //   overflowTimeRunning: hasOverFlow ? result.overflowTimeRunning : null,
  //   timeRunningForPlanning: result.timeRunning,
  // });

  return { result, nextTime: result.nextTime, nextDay: result.nextDay, ghepKho };
};

//==================== HỖ TRỢ ====================//

export const getSpeed = (flute: string, machine: string, info: Record<string, number>): number => {
  const layer = parseInt(flute?.[0] ?? "0", 10);

  if (machine === "Máy 2 Lớp") return info.speed2Layer;
  if (machine === "Máy Quấn Cuồn") return info.paperRollSpeed;

  const key = `speed${layer}Layer`;
  const speed = info[key];

  if (!speed) {
    throw new Error(`Không tìm thấy tốc độ cho flute=${flute}`);
  }

  return speed;
};

export const isDuringBreak = (start: Date, end: Date) => {
  const breaks = [
    { start: "11:30", end: "12:00", duration: 30 },
    { start: "17:00", end: "17:30", duration: 30 },
    { start: "02:00", end: "02:45", duration: 45 },
  ];
  return breaks.reduce((total, b) => {
    const [sh, sm] = b.start.split(":").map(Number);
    const [eh, em] = b.end.split(":").map(Number);
    const s = new Date(start);
    s.setHours(sh, sm, 0, 0);
    const e = new Date(start);
    e.setHours(eh, em, 0, 0);
    if (e <= s) e.setDate(e.getDate() + 1);
    return end > s && start < e ? total + b.duration : total;
  }, 0);
};

export const handleOverflow = async ({
  hasOverFlow,
  predictedEnd,
  endOfWork,
  planningId,
  currentDay,
  timeStart,
  transaction,
}: {
  hasOverFlow: boolean;
  predictedEnd: Date;
  endOfWork: Date;
  planningId: number;
  currentDay: Date;
  timeStart: string;
  transaction: any;
}) => {
  if (!hasOverFlow) {
    await timeOverflowPlanning.destroy({ where: { planningId }, transaction });
    return {
      dayStart: currentDay.toISOString().split("T")[0],
      timeRunning: formatTime(predictedEnd),
      nextTime: predictedEnd,
      nextDay: currentDay,
    };
  }

  const overflowMin = (predictedEnd.getTime() - endOfWork.getTime()) / 60000;
  const overflowDay = new Date(currentDay);
  overflowDay.setDate(overflowDay.getDate() + 1);

  const startOverflow = parseTime(timeStart);
  startOverflow.setDate(startOverflow.getDate() + 1);

  const overflowEnd = new Date(startOverflow);
  overflowEnd.setMinutes(overflowEnd.getMinutes() + overflowMin);

  await timeOverflowPlanning.destroy({ where: { planningId }, transaction });
  await timeOverflowPlanning.create(
    {
      planningId,
      overflowDayStart: new Date(overflowDay.toISOString().split("T")[0]),
      overflowTimeRunning: formatTime(overflowEnd),
    },
    { transaction }
  );

  return {
    dayStart: currentDay.toISOString().split("T")[0],
    timeRunning: formatTime(endOfWork),
    nextTime: overflowEnd,
    nextDay: overflowDay,
  };
};

export const parseTime = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
};

export const formatTime = (d: Date) => {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

export const combineDateAndHHMMSS = (dateObj: Date, hhmmss: string) => {
  const [h, m, s = 0] = hhmmss.split(":").map(Number);
  const d = new Date(dateObj);
  d.setHours(h, m, s, 0);
  return d;
};

export const getInitialCursor = async ({
  machine,
  dayStart,
  timeStart,
  transaction,
}: {
  machine: string;
  dayStart: string | Date;
  timeStart: string;
  transaction: any;
}) => {
  const day = new Date(dayStart);
  const dayStr = day.toISOString().split("T")[0];

  // Bắt đầu với base = dayStart + timeStart
  const baseTime = parseTime(timeStart);
  baseTime.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());

  let currentTime = baseTime;
  let currentDay = new Date(day);
  let lastGhepKho = null;

  // A) Kiểm tra đơn complete trong cùng ngày
  const lastComplete = await PlanningPaper.findOne({
    where: { chooseMachine: machine, status: "complete", dayStart: dayStr },
    order: [["timeRunning", "DESC"]],
    attributes: ["timeRunning", "ghepKho"],
    transaction,
  });

  if (lastComplete?.timeRunning) {
    const completeTime = combineDateAndHHMMSS(currentDay, lastComplete.timeRunning);
    if (completeTime > currentTime) {
      currentTime = completeTime;
      lastGhepKho = lastComplete.ghepKho ?? lastGhepKho;
    }
  }

  // B) Kiểm tra overflow mới nhất (ưu tiên cao hơn)
  const lastOverflow = await timeOverflowPlanning.findOne({
    include: [
      {
        model: PlanningPaper,
        attributes: ["status", "ghepKho", "chooseMachine"],
        where: { chooseMachine: machine, status: "complete" },
        required: true,
      },
    ],
    order: [
      ["overflowDayStart", "DESC"],
      ["overflowTimeRunning", "DESC"],
    ],
    transaction,
  });

  if (lastOverflow?.overflowTimeRunning) {
    const overflowDay = new Date(lastOverflow.overflowDayStart ?? "");
    const overflowTime = combineDateAndHHMMSS(overflowDay, lastOverflow.overflowTimeRunning);

    // Nếu overflow mới hơn currentTime → cập nhật cursor
    if (overflowTime > currentTime) {
      currentTime = overflowTime;
      currentDay = overflowDay;
      lastGhepKho = lastOverflow.PlanningPaper?.ghepKho ?? lastGhepKho;
    }
  }

  // C) Trả về con trỏ cuối cùng
  return { currentTime, currentDay, lastGhepKho };
};
