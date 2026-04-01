import { BreakTime } from "../../../interface/types";

//HELPER FOR TIME RUNNING
export const formatTimeToHHMMSS = (date: Date) => {
  return date.toTimeString().split(" ")[0];
};

export const addMinutes = (date: Date | string, mins: number) => {
  const d = new Date(date);
  let totalMinutes = mins;

  while (true) {
    const end = new Date(d);
    end.setMinutes(end.getMinutes() + totalMinutes);

    const breakMinutes = isDuringBreak(d, end);

    const newTotal = mins + breakMinutes;

    // console.log(
    //   "totalMinutes:",
    //   totalMinutes,
    //   "breakMinutes:",
    //   breakMinutes,
    //   "newTotal:",
    //   newTotal
    // );

    if (newTotal === totalMinutes) {
      return end;
    }

    totalMinutes = newTotal;
  }
};

export const addDays = (date: Date | string, days: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

export const formatDate = (date: Date) => {
  return date.toISOString().split("T")[0];
};

export const getWorkShift = (day: Date, startTime: string, hours: number) => {
  const start = parseTimeOnly(startTime);
  start.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());
  const end = new Date(start);
  end.setHours(start.getHours() + hours);
  return { startOfWorkTime: start, endOfWorkTime: end };
};

export const parseTimeOnly = (timeStr: string) => {
  const [h, m] = timeStr.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
};

const isDuringBreak = (start: Date, end: Date) => {
  const breaks: BreakTime[] = [
    { start: "11:30", end: "12:00", duration: 30 },
    { start: "17:00", end: "17:30", duration: 30 },
    { start: "02:00", end: "02:45", duration: 45 },
  ];

  let totalBreak = 0;
  for (const brk of breaks) {
    const bStart = parseTimeOnly(brk.start);
    const bEnd = parseTimeOnly(brk.end);

    // Gán cùng ngày với 'start'
    bStart.setFullYear(start.getFullYear(), start.getMonth(), start.getDate());
    bEnd.setFullYear(start.getFullYear(), start.getMonth(), start.getDate());

    if (bEnd <= bStart) bEnd.setDate(bEnd.getDate() + 1);

    if (end > bStart && start < bEnd) {
      totalBreak += brk.duration;
    }
  }

  return totalBreak;
};

export const setTimeOnDay = (date: Date, timeStrOrDate: string | Date) => {
  const t =
    typeof timeStrOrDate === "string" ? parseTimeOnly(timeStrOrDate) : new Date(timeStrOrDate);
  t.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
  return t;
};

export const mergeShiftField = (currentValue: string, incoming?: string) => {
  if (!incoming) return currentValue;

  const newValue = incoming.trim();
  const exists = currentValue
    .split(",")
    .map((s) => s.trim())
    .includes(newValue);

  if (!exists) {
    return currentValue ? `${currentValue}, ${newValue}` : newValue;
  }

  return currentValue;
};

export const buildStagesDetails = async ({
  detail,
  getBoxTimes,
  getPlanningBoxId,
  getAllOverflow,
}: {
  detail: any;
  getBoxTimes: (d: any) => any[];
  getPlanningBoxId: (d: any) => number;
  getAllOverflow: (planningBoxId: number) => Promise<any[]>;
}) => {
  // lấy toàn bộ stages bình thường
  const normalStages = getBoxTimes(detail)?.map((s) => s.toJSON()) ?? [];

  // lấy overflow theo planningBoxId
  const planningBoxId = getPlanningBoxId(detail);
  const allOverflow = await getAllOverflow(planningBoxId);

  // gom overflow theo machine
  const overflowByMachine: Record<string, any> = {};
  for (const ov of allOverflow) {
    overflowByMachine[ov.machine as string] = ov;
  }

  // merge stage + overflow tương ứng
  const stages = normalStages.map((stage) => ({
    ...stage,
    timeOverFlow: overflowByMachine[String(stage.machine)] ?? null,
  }));

  return stages;
};
