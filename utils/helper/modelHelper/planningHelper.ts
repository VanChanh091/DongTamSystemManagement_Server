import { Op } from "sequelize";
import { Order } from "../../../models/order/order";
import { Customer } from "../../../models/customer/customer";
import { PlanningBox } from "../../../models/planning/planningBox";
import { CacheManager } from "../cache/cacheManager";
import redisCache from "../../../assest/configs/redisCache";
import { Request, Response } from "express";
import { BreakTime, FilterDataFromCacheProps } from "../../../interface/types";
import { AppError } from "../../appError";
import { dashboardRepository } from "../../../repository/dashboardRepository";
import { normalizeVN } from "../normalizeVN";
import { planningRepository } from "../../../repository/planningRepository";
import { CacheKey } from "../cache/cacheKey";

//get planningPaper properties
export const getPlanningByField = async <T>({
  cacheKey,
  keyword,
  getFieldValue,
  whereCondition,
  message,
  isBox = false,
}: FilterDataFromCacheProps<T>) => {
  try {
    const lowerKeyword = keyword?.toLowerCase?.() || "";
    let allData = await redisCache.get(cacheKey);
    let sourceMessage = "";

    if (!allData) {
      allData = isBox
        ? await planningRepository.getPlanningBoxSearch(whereCondition)
        : await dashboardRepository.getDbPlanningSearch(whereCondition);

      await redisCache.set(cacheKey, JSON.stringify(allData), "EX", 900);
      sourceMessage = `Get ${cacheKey} from DB`;
    } else {
      allData = JSON.parse(allData);
      sourceMessage = message || `Get ${cacheKey} from cache`;
    }

    // Lọc dữ liệu
    const filteredData = allData.filter((item: any) => {
      const fieldValue = getFieldValue(item);

      return fieldValue != null
        ? normalizeVN(String(fieldValue).toLowerCase()).includes(normalizeVN(lowerKeyword))
        : false;
    });

    return { message: sourceMessage, data: filteredData };
  } catch (error) {
    console.log(`error to get planning`, error);
    throw AppError.ServerError();
  }
};

//get planningBox properties
export const getPlanningBoxByField = async (req: Request, res: Response, field: string) => {
  const { machine } = req.query as { machine: string };
  const value = req.query[field] as string;

  if (!machine || !value) {
    return res.status(400).json({
      message: "Thiếu machine hoặc giá trị tìm kiếm",
    });
  }

  const { box } = CacheKey.planning;
  const cacheKey = box.machine(machine);

  try {
    const cachedData = await redisCache.get(cacheKey);
    if (cachedData) {
      const parsed = JSON.parse(cachedData);

      const filtered = parsed.filter((item: any) => {
        const order = item.Order;
        if (field === "customerName") {
          return order?.Customer?.customerName?.toLowerCase().includes(value.toLowerCase());
        } else if (field === "flute") {
          return order?.flute?.toLowerCase().includes(value.toLowerCase());
        } else if (field === "QC_box") {
          return order?.QC_box?.toLowerCase().includes(value.toLowerCase());
        }
        return false;
      });

      return res.json({
        message: `Lọc planning theo ${field}: ${value} (cache)`,
        data: filtered,
      });
    }

    // Build query nếu không có cache
    const whereClause = { chooseMachine: machine };

    const orderInclude: any = {
      model: Order,
      attributes: ["flute", "QC_box"],
      include: [
        {
          model: Customer,
          attributes: ["customerName", "companyName"],
        },
      ],
    };

    if (field == "customerName") {
      orderInclude.include[0].required = true;
      orderInclude.include[0].where = {
        customerName: {
          [Op.like]: `%${value}%`,
        },
      };
    }

    if (field == "flute") {
      orderInclude.where = {
        flute: {
          [Op.like]: `%${value}%`,
        },
      };
    }

    if (field == "QC_box") {
      orderInclude.where = {
        QC_box: {
          [Op.like]: `%${value}%`,
        },
      };
    }

    const planning = await PlanningBox.findAll({
      where: whereClause,
      include: [orderInclude],
    });

    return res.status(200).json({
      message: `Lọc planning theo ${field}: ${value}`,
      data: planning,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

//get db planning by field
export const getDbPlanningByField = async <T>({
  cacheKey,
  keyword,
  getFieldValue,
  page,
  pageSize,
  message,
}: FilterDataFromCacheProps<T>) => {
  const currentPage = Number(page) || 1;
  const currentPageSize = Number(pageSize) || 20;
  const lowerKeyword = keyword?.toLowerCase?.() || "";

  try {
    let allData = await redisCache.get(cacheKey);
    let sourceMessage = "";

    if (!allData) {
      allData = await dashboardRepository.getDbPlanningSearch();
      await redisCache.set(cacheKey, JSON.stringify(allData), "EX", 900);
      sourceMessage = `Get ${cacheKey} from DB`;
    } else {
      allData = JSON.parse(allData);
      sourceMessage = message || `Get ${cacheKey} from cache`;
    }

    // Lọc dữ liệu
    const filteredData = allData.filter((item: any) => {
      const fieldValue = getFieldValue(item);

      return fieldValue != null
        ? normalizeVN(String(fieldValue).toLowerCase()).includes(normalizeVN(lowerKeyword))
        : false;
    });

    // Phân trang
    const totalCustomers = filteredData.length;
    const totalPages = Math.ceil(totalCustomers / currentPageSize);

    const offset = (currentPage - 1) * currentPageSize;
    const paginatedData = filteredData.slice(offset, offset + currentPageSize);

    return {
      message: sourceMessage,
      data: paginatedData,
      totalCustomers,
      totalPages,
      currentPage,
    };
  } catch (error) {
    console.log(`error to get planning`, error);
    throw AppError.ServerError();
  }
};

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
