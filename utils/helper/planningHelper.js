import { Op, or } from "sequelize";
import Redis from "ioredis";
import Order from "../../models/order/order.js";
import Customer from "../../models/customer/customer.js";
import Box from "../../models/order/box.js";
import PlanningPaper from "../../models/planning/planningPaper.js";
import PlanningBox from "../../models/planning/planningBox.js";

const redisCache = new Redis();

//get planningPaper properties
export const getPlanningPaperByField = async (req, res, field) => {
  const { machine } = req.query;
  const value = req.query[field];

  if (!machine || !value) {
    return res.status(400).json({
      message: "Thiếu machine hoặc giá trị tìm kiếm",
    });
  }

  try {
    const cacheKey = `planning:machine:${machine}`;

    const cachedData = await redisCache.get(cacheKey);
    if (cachedData) {
      const parsed = JSON.parse(cachedData);

      const filtered = parsed.filter((item) => {
        const order = item.Order;
        if (field === "customerName") {
          return order?.Customer?.customerName
            ?.toLowerCase()
            .includes(value.toLowerCase());
        } else if (field === "flute") {
          return order?.flute?.toLowerCase().includes(value.toLowerCase());
        } else if (field === "ghepKho") {
          return item?.ghepKho == value;
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
    if (field === "ghepKho") {
      whereClause.ghepKho = value;
    }

    const orderInclude = {
      model: Order,
      required: true,
      attributes: ["flute"],
      include: [
        {
          model: Customer,
          attributes: ["customerName", "companyName"],
        },
      ],
    };

    // Thêm where vào order/customer nếu cần
    if (field === "flute") {
      orderInclude.where = {
        flute: {
          [Op.like]: `%${value}%`,
        },
      };
    }

    if (field === "customerName") {
      orderInclude.include[0].required = true;
      orderInclude.include[0].where = {
        customerName: {
          [Op.like]: `%${value}%`,
        },
      };
    }

    const planning = await PlanningPaper.findAll({
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

//get planningBox properties
export const getPlanningBoxByField = async (req, res, field) => {
  const { machine } = req.query;
  const value = req.query[field];

  if (!machine || !value) {
    return res.status(400).json({
      message: "Thiếu machine hoặc giá trị tìm kiếm",
    });
  }

  try {
    const cacheKey = `planning:box:machine:${machine}`;

    const cachedData = await redisCache.get(cacheKey);
    if (cachedData) {
      const parsed = JSON.parse(cachedData);

      const filtered = parsed.filter((item) => {
        const order = item.Order;
        if (field === "customerName") {
          return order?.Customer?.customerName
            ?.toLowerCase()
            .includes(value.toLowerCase());
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

    const orderInclude = {
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

export const formatTimeToHHMMSS = (date) => {
  return date.toTimeString().split(" ")[0];
};

export const addMinutes = (date, mins) => {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() + mins);
  return d;
};

export const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

export const formatDate = (date) => {
  return date.toISOString().split("T")[0];
};

export const getWorkShift = (day, startTime, hours) => {
  const start = parseTimeOnly(startTime);
  start.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());
  const end = new Date(start);
  end.setHours(start.getHours() + hours);
  return { startOfWorkTime: start, endOfWorkTime: end };
};

export const parseTimeOnly = (timeStr) => {
  const [h, m] = timeStr.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
};

export const isDuringBreak = (start, end) => {
  const breaks = [
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

export const setTimeOnDay = (dayDate, timeStrOrDate) => {
  const t =
    typeof timeStrOrDate === "string"
      ? parseTimeOnly(timeStrOrDate)
      : new Date(timeStrOrDate);
  t.setFullYear(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());
  return t;
};
