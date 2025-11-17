import { WasteNormBox } from "../../../models/admin/wasteNormBox";
import { PlanningBox } from "../../../models/planning/planningBox";
import { PlanningBoxTime } from "../../../models/planning/planningBoxMachineTime";
import { timeOverflowPlanning } from "../../../models/planning/timeOverflowPlanning";
import { planningRepository } from "../../../repository/planningRepository";
import {
  addDays,
  addMinutes,
  formatDate,
  formatTimeToHHMMSS,
  getWorkShift,
  isDuringBreak,
  parseTimeOnly,
  setTimeOnDay,
} from "../../../utils/helper/modelHelper/planningHelper";

// Tính thời gian cho danh sách planning
export const calTimeRunningPlanningBox = async ({
  machine,
  machineInfo,
  dayStart,
  timeStart,
  totalTimeWorking,
  plannings,
  transaction,
}: {
  machine: string;
  machineInfo: any;
  dayStart: string | Date;
  timeStart: string;
  totalTimeWorking: number;
  plannings: any[];
  transaction: any;
}) => {
  const updated = [];
  let currentTime, currentDay;

  // ✅ Ưu tiên lấy đơn complete từ FE gửi xuống
  const feComplete = plannings
    .filter((p) => p.boxTimes && p.boxTimes[0] && p.boxTimes[0].status === "complete")
    .sort(
      (a, b) =>
        new Date(b.boxTimes[0].dayStart).getTime() - new Date(a.boxTimes[0].dayStart).getTime()
    )[0];

  if (feComplete) {
    const feBox = feComplete.boxTimes[0];

    if (feComplete.hasOverFlow) {
      // Lấy overflow mới nhất cho planning này & machine
      const overflowRecord = await planningRepository.getModelById(
        timeOverflowPlanning,
        { planningBoxId: feComplete.planningBoxId, machine },
        { transaction }
      );

      if (overflowRecord && overflowRecord.overflowDayStart && overflowRecord.overflowTimeRunning) {
        currentDay = new Date(overflowRecord.overflowDayStart);
        currentTime = combineDateAndHHMMSS(currentDay, overflowRecord.overflowTimeRunning);
      } else if (feBox && feBox.dayStart && feBox.timeRunning) {
        currentDay = new Date(feBox.dayStart);
        currentTime = combineDateAndHHMMSS(currentDay, feBox.timeRunning);
      } else if (feComplete.dayStart && feComplete.timeRunning) {
        currentDay = new Date(feComplete.dayStart);
        currentTime = combineDateAndHHMMSS(currentDay, feComplete.timeRunning);
      } else {
        const initCursor = await getInitialCursor({
          machine,
          dayStart,
          timeStart,
          transaction,
        });
        currentTime = initCursor.currentTime;
        currentDay = initCursor.currentDay;
      }
    } else {
      // không overflow -> ưu tiên boxTime, fallback planning
      if (feBox && feBox.dayStart && feBox.timeRunning) {
        currentDay = new Date(feBox.dayStart);
        currentTime = combineDateAndHHMMSS(currentDay, feBox.timeRunning);
      } else {
        currentDay = new Date(feComplete.dayStart);
        currentTime = combineDateAndHHMMSS(currentDay, feComplete.timeRunning);
      }
    }
  } else {
    // fallback: lấy con trỏ từ DB
    const initCursor = await getInitialCursor({
      machine,
      dayStart,
      timeStart,
      transaction,
    });
    currentTime = initCursor.currentTime;
    currentDay = initCursor.currentDay;
  }

  for (const planning of plannings) {
    const boxTime = planning.boxTimes && planning.boxTimes[0] ? planning.boxTimes[0] : null;

    if (boxTime && boxTime.status === "complete") continue;

    const data = await calculateTimeForOnePlanning({
      planning: planning,
      machine,
      machineInfo,
      currentTime,
      currentDay,
      timeStart,
      totalTimeWorking,
      transaction,
    });
    currentTime = data.nextTime;
    currentDay = data.nextDay;

    updated.push(data.result);
  }
  return updated;
};

// Tính thời gian cho từng planning (sửa để ngày/giờ luôn đồng bộ)
export const calculateTimeForOnePlanning = async ({
  planning,
  machine,
  machineInfo,
  currentTime,
  currentDay,
  timeStart,
  totalTimeWorking,
  transaction,
}: {
  planning: any;
  machine: string;
  machineInfo: any;
  currentTime: Date;
  currentDay: Date;
  timeStart: string;
  totalTimeWorking: number;
  transaction: any;
}): Promise<{
  result: any;
  nextTime: Date;
  nextDay: Date;
}> => {
  const { planningBoxId, sortPlanning, Order, status } = planning;
  const isMayIn = machine.includes("Máy In");

  //chặn update đơn complete
  if (status === "complete") {
    return {
      result: { planningBoxId, skipped: true, status },
      nextTime: currentTime,
      nextDay: currentDay,
    };
  }

  // ✅ chỉ dùng quantityCustomer làm runningPlan
  const runningPlan = Order?.quantityCustomer || 0;

  const productionMinutes = calculateProductionMinutes({
    runningPlan,
    Order,
    machineInfo,
    isMayIn,
  });

  // --- logic giữ nguyên ---
  const { startOfWorkTime: rawStart, endOfWorkTime: rawEnd } = getWorkShift(
    currentDay,
    timeStart,
    totalTimeWorking
  );
  const startOfWorkTime = setTimeOnDay(currentDay, rawStart);
  const endOfWorkTime = setTimeOnDay(currentDay, rawEnd);
  currentTime = setTimeOnDay(currentDay, currentTime);

  if (currentTime < startOfWorkTime) {
    currentTime = setTimeOnDay(currentDay, startOfWorkTime);
  }

  if (currentTime >= endOfWorkTime) {
    const nextDay = addDays(currentDay, 1);
    const nextStart = setTimeOnDay(nextDay, timeStart);
    return await calculateTimeForOnePlanning({
      planning,
      machine,
      machineInfo,
      currentTime: nextStart,
      currentDay: nextDay,
      timeStart,
      totalTimeWorking,
      transaction,
    });
  }

  let result: any = {
    planningBoxId,
    dayStart: currentDay.toISOString().split("T")[0],
  };
  let hasOverFlow = false;

  const tempEndTime = addMinutes(currentTime, productionMinutes);
  const extraBreak = isDuringBreak(currentTime, tempEndTime);
  const predictedEndTime = addMinutes(currentTime, productionMinutes + extraBreak);

  if (predictedEndTime > endOfWorkTime) {
    hasOverFlow = true;
    result.timeRunning = formatTimeToHHMMSS(endOfWorkTime);

    const overflowData = await handleOverflow({
      planningBoxId,
      sortPlanning,
      predictedEndTime,
      endOfWorkTime,
      timeStart,
      currentDay,
      machine,
      transaction,
    });

    Object.assign(result, overflowData);

    result.hasOverFlow = true;

    currentDay = new Date(overflowData.overflowDayStart);
    currentTime = setTimeOnDay(currentDay, overflowData.overflowTimeRunning);
  } else {
    result.timeRunning = formatTimeToHHMMSS(predictedEndTime);
    currentTime = predictedEndTime;

    await planningRepository.deleteModelData(
      timeOverflowPlanning,
      { planningBoxId, machine },
      transaction
    );
  }

  // ✅ update hasOverFlow theo quantityCustomer
  await planningRepository.updateDataModel(
    PlanningBox,
    { hasOverFlow: hasOverFlow && runningPlan > 0 },
    { where: { planningBoxId }, transaction }
  );

  // tính waste
  const wasteBoxValue = await calculateWasteBoxValue({
    machine,
    runningPlan,
    Order,
    isMayIn,
    transaction,
  });
  if (wasteBoxValue !== null) {
    result.wasteBox = Math.round(wasteBoxValue);
  }

  await planningRepository.updateDataModel(
    PlanningBoxTime,
    { ...result, sortPlanning },
    { where: { planningBoxId, machine }, transaction }
  );

  // ================== LOG CHI TIẾT ==================
  // console.log(
  //   "PlanningBox",
  //   JSON.stringify(
  //     {
  //       machine,
  //       status: planning.status,
  //       runningPlan,
  //       sortPlanning,
  //       totalTimeWorking,
  //       shift: {
  //         startOfWorkTime: formatTimeToHHMMSS(startOfWorkTime),
  //         endOfWorkTime: formatTimeToHHMMSS(endOfWorkTime),
  //       },
  //       productionMinutes,
  //       breakMinutes: extraBreak,
  //       result,
  //     },
  //     null,
  //     2
  //   )
  // );
  // console.log("========================================");

  return { result, nextTime: currentTime, nextDay: currentDay };
};

// Tính phút sản xuất (có log)
export const calculateProductionMinutes = ({
  runningPlan,
  Order,
  machineInfo,
  isMayIn,
}: {
  runningPlan: number;
  Order: {
    numberChild?: number | null;
    box: { dataValues?: Record<string, any> };
  } | null;
  machineInfo: {
    speedOfMachine: number;
    timeToProduct: number;
  };
  isMayIn: boolean;
}) => {
  if (runningPlan <= 0) return 0;
  const numberChild = Order?.numberChild || 1;
  const totalLength = runningPlan / numberChild;
  const totalTime = totalLength / (machineInfo.speedOfMachine / 60);

  const box = Order?.box.dataValues;

  if (isMayIn && box) {
    const { inMatTruoc = 0, inMatSau = 0 } = box;
    return Math.ceil(machineInfo.timeToProduct * (inMatTruoc + inMatSau) + totalTime);
  }
  return Math.ceil(machineInfo.timeToProduct + totalTime);
};

// Xử lý overflow
export const handleOverflow = async ({
  planningBoxId,
  sortPlanning,
  predictedEndTime,
  endOfWorkTime,
  timeStart,
  currentDay,
  machine,
  transaction,
}: {
  planningBoxId: number;
  sortPlanning: number;
  predictedEndTime: Date;
  endOfWorkTime: Date;
  timeStart: string;
  currentDay: Date;
  machine: string;
  transaction: any;
}) => {
  const overflowMinutes = (predictedEndTime.getTime() - endOfWorkTime.getTime()) / 60000;
  const overflowDayStart = formatDate(addDays(currentDay, 1));
  const overflowTimeRunning = formatTimeToHHMMSS(
    addMinutes(parseTimeOnly(timeStart), overflowMinutes)
  );

  await planningRepository.deleteModelData(
    timeOverflowPlanning,
    { planningBoxId, machine },
    transaction
  );

  await planningRepository.createPlanning(
    timeOverflowPlanning,
    {
      planningBoxId,
      machine,
      overflowDayStart: new Date(overflowDayStart),
      overflowTimeRunning,
    },
    transaction
  );

  return {
    overflowDayStart,
    overflowTimeRunning,
    overflowMinutes: `${Math.round(overflowMinutes)} phút`,
  };
};

// Tính waste
export const calculateWasteBoxValue = async ({
  machine,
  runningPlan,
  Order,
  isMayIn,
  transaction,
}: {
  machine: string;
  runningPlan: number;
  Order: { box: { dataValues?: Record<string, any> } };
  isMayIn: boolean;
  transaction: any;
}) => {
  if (runningPlan <= 0) return null;
  const wasteNorm = await planningRepository.getModelById(
    WasteNormBox,
    { machineName: machine },
    { transaction }
  );

  if (!wasteNorm) return null;

  const {
    colorNumberOnProduct = 0,
    paperNumberOnProduct = 0,
    totalLossOnTotalQty = 0,
  } = wasteNorm.get();

  const box = Order?.box.dataValues;

  const c = colorNumberOnProduct ?? 0;
  const p = paperNumberOnProduct ?? 0;

  if (isMayIn && box) {
    const { inMatTruoc = 0, inMatSau = 0 } = box;
    return c * inMatTruoc + c * inMatSau + runningPlan * (totalLossOnTotalQty / 100);
  }
  return p + runningPlan * (totalLossOnTotalQty / 100);
};

export const combineDateAndHHMMSS = (dateObj: Date | string, hhmmss: string): Date => {
  const [h, m, s = 0] = hhmmss.split(":").map((x) => Number(x) || 0);

  const d = new Date(dateObj);
  d.setHours(h, m, s || 0, 0);
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

  // 1) base = dayStart + timeStart
  let base = parseTimeOnly(timeStart);
  base.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());

  let currentTime = base;
  let currentDay = new Date(day);

  // A) Lấy đơn complete trong cùng ngày
  const lastComplete = await planningRepository.getModelById(
    PlanningBoxTime,
    { machine: machine, status: "complete", dayStart: dayStr },
    { order: [["timeRunning", "DESC"]], attributes: ["timeRunning"], transaction }
  );

  if (lastComplete?.timeRunning) {
    const time = combineDateAndHHMMSS(currentDay, lastComplete.timeRunning);
    if (time > currentTime) {
      currentTime = time;
    }
  }

  // B) Lấy overflow từ hôm trước hoặc hôm nay
  const lastOverflow = await planningRepository.getTimeOverflowBox(machine, transaction);

  if (lastOverflow?.overflowTimeRunning) {
    const overflowDay = new Date(lastOverflow.overflowDayStart ?? "");
    const time = combineDateAndHHMMSS(overflowDay, lastOverflow.overflowTimeRunning);
    if (time > currentTime) {
      currentTime = time;
    }
  }

  return { currentTime, currentDay };
};
