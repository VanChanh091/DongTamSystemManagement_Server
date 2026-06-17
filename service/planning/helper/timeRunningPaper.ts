import { Op } from "sequelize";
import { BreakTime } from "../../../interface/types";
import { PlanningPaper } from "../../../models/planning/planningPaper";
import { planningHelper } from "../../../repository/planning/planningHelper";
import { timeOverflowPlanning } from "../../../models/planning/timeOverflowPlanning";
import { planningPaperRepository } from "../../../repository/planning/planningPaperRepository";

//Công thức tính thời gian: time = (Thời gian A/B + (tổng dài / tốc độ)) / (hiệu suất / 100)
// Trong đó:
// A: Thời gian thay đổi kích thước (phút) (nếu đơn đầu tiên trong ngày thì luôn tính thời gian thay đổi kích thước (30p))
// B: Thời gian thay đổi cùng kích thước (phút) (nếu đơn cùng khổ ghép với đơn trước đó thì tính thời gian này (5p), ngược lại tính thời gian thay đổi kích thước)
// Tổng dài: tổng dài cần chạy (mét) = (số lượng chạy * dài khổ) / số con
// Tốc độ: tốc độ máy theo lớp giấy (mét/phút) -> lấy từ thông số máy
// Hiệu suất: hiệu suất máy (%)

//công thức phế liệu: totalLoss = flute.E + flute.B + flute.C + flute.E2 + haoPhi + knife + bottom;
//Trong đó: gkTh = ghepKho / 100, định lượng (MA115) -> 115/1000
//Mặt E, E2, B, C -> gkTh * waveCrest * định lượng
//Sóng E, E2, B, C -> gkTh * waveCrest * định lượng * hệ số sóng (lấy từ thông số máy)
//Đáy = flute.E + flute.B + flute.C + softLiner (lớp cuối cùng)
//Dao = oneM2WaveCrestSoft * lossInSheetingAndSlitting
//Hao phí = totalLength * oneM2WaveCrest * (SoftlossInProcess / 100)
//totalLength = runningPlan / numberChild;
//oneM2WaveCrestSoft = bottom / wasteNorm.waveCrestSoft;

export const updateSortPlanning = async (
  updateIndex: { planningId: number; sortPlanning: number | null }[],
  transaction: any,
) => {
  const updates = updateIndex
    .filter((item) => item.sortPlanning)
    .map((item) =>
      planningHelper.updateDataModel({
        model: PlanningPaper,
        data: { sortPlanning: item.sortPlanning },
        options: {
          where: { planningId: item.planningId, status: { [Op.ne]: "complete" } },
          transaction,
        },
      }),
    );
  await Promise.all(updates);
};

export const calculateTimeRunning = async ({
  plannings,
  machineMap,
  machine,
  dayStart,
  timeStart,
  totalTimeWorking,
  transaction,
}: {
  plannings: any[];
  machineMap: any;
  machine: string;
  dayStart: string | Date;
  timeStart: string;
  totalTimeWorking: number;
  transaction: any;
}) => {
  const updated = [];

  const currentDay = new Date(dayStart);
  const [hh, mm] = timeStart.split(":").map(Number);

  const currentTime = new Date(currentDay);
  currentTime.setHours(hh, mm, 0, 0);

  let lastGhepKho: number | null = null;
  let loopTime = currentTime;
  let loopDay = currentDay;

  // Tính từng đơn
  for (let i = 0; i < plannings.length; i++) {
    const planning = plannings[i];
    if (planning.status === "complete") continue;

    const data = await calculateTimeForOnePlanning({
      planning,
      machine,
      machineMap,
      currentTime: loopTime,
      currentDay: loopDay,
      timeStart,
      totalTimeWorking,
      lastGhepKho,
      transaction,
      isFirst: i === 0,
    });

    loopTime = data.nextTime;
    loopDay = data.nextDay;
    lastGhepKho = data.ghepKho ?? null;

    updated.push(data.result);
  }

  return updated;
};

// HÀM CHÍNH: Tính toán thời gian
const calculateTimeForOnePlanning = async ({
  planning,
  machine,
  machineMap,
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
    lengthPaperPlanning: number;
    Order?: {
      numberChild?: number | null;
      flute?: string | null;
      dvt: string;
    } | null;
    status?: string;
  };
  machine: string;
  machineMap: any;
  currentTime: Date;
  currentDay: Date;
  timeStart: string;
  totalTimeWorking: number;
  lastGhepKho: number | null;
  transaction: any;
  isFirst: boolean;
}) => {
  const { planningId, runningPlan, ghepKho, Order } = planning;

  const isKg = planning.Order?.dvt === "Kg";
  const activeMachine = isKg ? machineMap.kg : machineMap.m2;

  // console.log(`dvt: ${planning.Order?.dvt}`);
  // console.log(`active machine: ${JSON.stringify(activeMachine)}`);
  // console.log(`==========================================`);

  if (!activeMachine) {
    throw new Error(`Thiếu cấu hình máy hệ ${isKg ? "Kg" : "m2"} cho máy ${machine}`);
  }

  //total length
  const lengthPaper = planning.lengthPaperPlanning / 100;
  const numberChild = Order?.numberChild || 1;
  const totalLength = isKg ? runningPlan : (runningPlan * lengthPaper) / numberChild;

  //get speed
  const flute = Order?.flute || "3B";
  const speed = getSpeed(flute, machine, activeMachine);
  const performance = activeMachine.machinePerformance;

  //check same size
  const isSameSize = lastGhepKho && ghepKho === lastGhepKho;
  let changeTime = 0;

  if (machine === "Máy Quấn Cuồn") {
    changeTime = activeMachine.timeChangeSize;
  } else if (isFirst) {
    changeTime = activeMachine.timeChangeSize;
  } else {
    // Áp dụng logic cùng khổ/khác khổ cho cả đơn mét và đơn kg
    changeTime = isSameSize ? activeMachine.timeChangeSameSize : activeMachine.timeChangeSize;
  }

  const productionMinutes = Math.ceil((changeTime + totalLength / speed) / (performance / 100));

  // --- Tính thời gian kết thúc ---
  let tempEnd = new Date(currentTime);
  tempEnd.setMinutes(tempEnd.getMinutes() + productionMinutes);
  let extraBreak = isDuringBreak(currentTime, tempEnd);

  let predictedEnd = new Date(currentTime);
  predictedEnd.setMinutes(predictedEnd.getMinutes() + productionMinutes + extraBreak);

  // --- Kiểm tra nhảy ca & Tràn giờ ---
  const [h, m] = timeStart.split(":").map(Number);

  // Tìm mốc bắt đầu của "Ngày sản xuất" chứa currentTime
  let startOfWork = new Date(currentTime);
  startOfWork.setHours(h, m, 0, 0);

  if (currentTime < startOfWork) {
    startOfWork.setDate(startOfWork.getDate() - 1);
  }

  // Mốc kết thúc của "Ngày sản xuất" đó
  let endOfWork = new Date(startOfWork);
  endOfWork.setHours(startOfWork.getHours() + totalTimeWorking);

  let hasOverFlow = false;

  if (totalTimeWorking >= 24) {
    hasOverFlow = false;

    /**
     * Nếu giờ kết thúc (predictedEnd) là 05:00 sáng (hôm sau) mà timeStart là 06:00
     * thì cái 05:00 đó vẫn thuộc về "Ngày sản xuất" của hôm trước.
     */
    let productionDate = new Date(predictedEnd);
    let pivotPoint = new Date(predictedEnd);
    pivotPoint.setHours(h, m, 0, 0);

    // Nếu chưa chạm đến mốc timeStart => vẫn thuộc về chu kỳ sản xuất của ngày trước.
    if (predictedEnd < pivotPoint) {
      productionDate.setDate(productionDate.getDate() - 1);
    }

    currentDay = productionDate;
    currentDay.setHours(0, 0, 0, 0);
  } else {
    // Nếu qua mốc kết thúc ca -> Bắt đầu ngày mới
    if (currentTime >= endOfWork) {
      startOfWork.setDate(startOfWork.getDate() + 1);
      endOfWork.setDate(endOfWork.getDate() + 1);
      currentTime = new Date(startOfWork);

      // Tính lại breakTime cho mốc giờ bắt đầu ca mới
      let newTempEnd = new Date(currentTime);
      newTempEnd.setMinutes(newTempEnd.getMinutes() + productionMinutes);
      extraBreak = isDuringBreak(currentTime, newTempEnd);

      predictedEnd = new Date(currentTime);
      predictedEnd.setMinutes(predictedEnd.getMinutes() + productionMinutes + extraBreak);
    }
    hasOverFlow = predictedEnd > endOfWork;

    currentDay = new Date(predictedEnd);
    currentDay.setHours(0, 0, 0, 0);
  }

  //xử lý tràn giờ
  const result = await handleOverflow({
    hasOverFlow,
    predictedEnd,
    endOfWork,
    planningId,
    currentDay,
    timeStart,
    transaction,
  });

  await planningHelper.updateDataModel({
    model: PlanningPaper,
    data: {
      dayStart: new Date(result.dayStart), // result.dayStart đã an toàn khỏi lỗi Timezone
      timeRunning: result.timeRunning,
      timeStart: timeStart,
      hasOverFlow,
    },
    options: { where: { planningId }, transaction },
  });

  return { result, nextTime: result.nextTime, nextDay: result.nextDay, ghepKho };
};

//==================== HỖ TRỢ ====================//

// Lấy ngày YYYY-MM-DD theo giờ Local (Việt Nam) để tránh lỗi UTC
const getLocalYYYYMMDD = (d: Date) => {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const handleOverflow = async ({
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
    await planningHelper.deleteModelData({
      model: timeOverflowPlanning,
      where: { planningId },
      transaction,
    });

    return {
      dayStart: getLocalYYYYMMDD(currentDay),
      timeRunning: formatTime(predictedEnd),
      nextTime: predictedEnd,
      nextDay: currentDay,
    };
  }

  const overflowMin = (predictedEnd.getTime() - endOfWork.getTime()) / 60000;

  // Tính ngày tràn (Cộng thêm 1 ngày)
  const overflowDay = new Date(currentDay);
  overflowDay.setDate(overflowDay.getDate() + 1);

  // Tạo startOverflow bám sát theo ngày tràn
  const [h, m] = timeStart.split(":").map(Number);
  const startOverflow = new Date(overflowDay);
  startOverflow.setHours(h, m, 0, 0);

  const overflowEnd = new Date(startOverflow);
  overflowEnd.setMinutes(overflowEnd.getMinutes() + overflowMin);

  await planningHelper.deleteModelData({
    model: timeOverflowPlanning,
    where: { planningId },
    transaction,
  });

  await planningHelper.createData({
    model: timeOverflowPlanning,
    data: {
      planningId,
      overflowDayStart: new Date(getLocalYYYYMMDD(overflowDay)),
      overflowTimeRunning: formatTime(overflowEnd),
    },
    transaction,
  });

  return {
    dayStart: getLocalYYYYMMDD(currentDay),
    timeRunning: formatTime(endOfWork), // Chốt ở cuối ca (ví dụ 18:00)
    nextTime: overflowEnd,
    nextDay: overflowDay, // Đẩy sang ngày mới
  };
};

const getSpeed = (flute: string, machine: string, info: Record<string, number>): number => {
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

const isDuringBreak = (start: Date, end: Date) => {
  const breaks: BreakTime[] = [
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

const parseTime = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
};

const formatTime = (d: Date) => {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const combineDateAndHHMMSS = (dateObj: Date, hhmmss: string) => {
  const [h, m, s = 0] = hhmmss.split(":").map(Number);
  const d = new Date(dateObj);
  d.setHours(h, m, s, 0);
  return d;
};

const getInitialCursor = async ({
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
  const lastComplete = await planningHelper.getModelById({
    model: PlanningPaper,
    where: { chooseMachine: machine, status: "complete", dayStart: dayStr },
    options: {
      order: [["timeRunning", "DESC"]],
      attributes: ["timeRunning", "ghepKho"],
      transaction,
    },
  });

  if (lastComplete?.timeRunning) {
    const completeTime = combineDateAndHHMMSS(currentDay, lastComplete.timeRunning);
    if (completeTime > currentTime) {
      currentTime = completeTime;
      lastGhepKho = lastComplete.ghepKho ?? lastGhepKho;
    }
  }

  // B) Kiểm tra overflow mới nhất (ưu tiên cao hơn)
  const lastOverflow = await planningPaperRepository.getTimeOverflowPaper(machine, transaction);

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
