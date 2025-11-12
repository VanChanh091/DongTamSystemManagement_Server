"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setTimeOnDay = exports.isDuringBreak = exports.parseTimeOnly = exports.getWorkShift = exports.formatDate = exports.addDays = exports.addMinutes = exports.formatTimeToHHMMSS = exports.getPlanningBoxByField = exports.getPlanningPaperByField = void 0;
const sequelize_1 = require("sequelize");
const order_1 = require("../../../models/order/order");
const customer_1 = require("../../../models/customer/customer");
const planningPaper_1 = require("../../../models/planning/planningPaper");
const planningBox_1 = require("../../../models/planning/planningBox");
const cacheManager_1 = require("../cacheManager");
const redisCache_1 = __importDefault(require("../../../configs/redisCache"));
//get planningPaper properties
const getPlanningPaperByField = async (req, res, field) => {
    const { machine } = req.query;
    const value = req.query[field];
    if (!machine || !value) {
        return res.status(400).json({
            message: "Thiếu machine hoặc giá trị tìm kiếm",
        });
    }
    const { paper } = cacheManager_1.CacheManager.keys.planning;
    const cacheKey = paper.machine(machine);
    try {
        const cachedData = await redisCache_1.default.get(cacheKey);
        if (cachedData) {
            const parsed = JSON.parse(cachedData);
            const filtered = parsed.filter((item) => {
                const order = item.Order;
                if (field === "customerName") {
                    return order?.Customer?.customerName?.toLowerCase().includes(value.toLowerCase());
                }
                else if (field === "flute") {
                    return order?.flute?.toLowerCase().includes(value.toLowerCase());
                }
                else if (field === "ghepKho") {
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
            model: order_1.Order,
            required: true,
            attributes: ["flute"],
            include: [
                {
                    model: customer_1.Customer,
                    attributes: ["customerName", "companyName"],
                },
            ],
        };
        // Thêm where vào order/customer nếu cần
        if (field === "flute") {
            orderInclude.where = {
                flute: {
                    [sequelize_1.Op.like]: `%${value}%`,
                },
            };
        }
        if (field === "customerName") {
            orderInclude.include[0].required = true;
            orderInclude.include[0].where = {
                customerName: {
                    [sequelize_1.Op.like]: `%${value}%`,
                },
            };
        }
        const planning = await planningPaper_1.PlanningPaper.findAll({
            where: whereClause,
            include: [orderInclude],
        });
        return res.status(200).json({
            message: `Lọc planning theo ${field}: ${value}`,
            data: planning,
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Lỗi server" });
    }
};
exports.getPlanningPaperByField = getPlanningPaperByField;
//get planningBox properties
const getPlanningBoxByField = async (req, res, field) => {
    const { machine } = req.query;
    const value = req.query[field];
    if (!machine || !value) {
        return res.status(400).json({
            message: "Thiếu machine hoặc giá trị tìm kiếm",
        });
    }
    const { box } = cacheManager_1.CacheManager.keys.planning;
    const cacheKey = box.machine(machine);
    try {
        const cachedData = await redisCache_1.default.get(cacheKey);
        if (cachedData) {
            const parsed = JSON.parse(cachedData);
            const filtered = parsed.filter((item) => {
                const order = item.Order;
                if (field === "customerName") {
                    return order?.Customer?.customerName?.toLowerCase().includes(value.toLowerCase());
                }
                else if (field === "flute") {
                    return order?.flute?.toLowerCase().includes(value.toLowerCase());
                }
                else if (field === "QC_box") {
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
            model: order_1.Order,
            attributes: ["flute", "QC_box"],
            include: [
                {
                    model: customer_1.Customer,
                    attributes: ["customerName", "companyName"],
                },
            ],
        };
        if (field == "customerName") {
            orderInclude.include[0].required = true;
            orderInclude.include[0].where = {
                customerName: {
                    [sequelize_1.Op.like]: `%${value}%`,
                },
            };
        }
        if (field == "flute") {
            orderInclude.where = {
                flute: {
                    [sequelize_1.Op.like]: `%${value}%`,
                },
            };
        }
        if (field == "QC_box") {
            orderInclude.where = {
                QC_box: {
                    [sequelize_1.Op.like]: `%${value}%`,
                },
            };
        }
        const planning = await planningBox_1.PlanningBox.findAll({
            where: whereClause,
            include: [orderInclude],
        });
        return res.status(200).json({
            message: `Lọc planning theo ${field}: ${value}`,
            data: planning,
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Lỗi server" });
    }
};
exports.getPlanningBoxByField = getPlanningBoxByField;
const formatTimeToHHMMSS = (date) => {
    return date.toTimeString().split(" ")[0];
};
exports.formatTimeToHHMMSS = formatTimeToHHMMSS;
const addMinutes = (date, mins) => {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() + mins);
    return d;
};
exports.addMinutes = addMinutes;
const addDays = (date, days) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
};
exports.addDays = addDays;
const formatDate = (date) => {
    return date.toISOString().split("T")[0];
};
exports.formatDate = formatDate;
const getWorkShift = (day, startTime, hours) => {
    const start = (0, exports.parseTimeOnly)(startTime);
    start.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());
    const end = new Date(start);
    end.setHours(start.getHours() + hours);
    return { startOfWorkTime: start, endOfWorkTime: end };
};
exports.getWorkShift = getWorkShift;
const parseTimeOnly = (timeStr) => {
    const [h, m] = timeStr.split(":").map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
};
exports.parseTimeOnly = parseTimeOnly;
const isDuringBreak = (start, end) => {
    const breaks = [
        { start: "11:30", end: "12:00", duration: 30 },
        { start: "17:00", end: "17:30", duration: 30 },
        { start: "02:00", end: "02:45", duration: 45 },
    ];
    let totalBreak = 0;
    for (const brk of breaks) {
        const bStart = (0, exports.parseTimeOnly)(brk.start);
        const bEnd = (0, exports.parseTimeOnly)(brk.end);
        // Gán cùng ngày với 'start'
        bStart.setFullYear(start.getFullYear(), start.getMonth(), start.getDate());
        bEnd.setFullYear(start.getFullYear(), start.getMonth(), start.getDate());
        if (bEnd <= bStart)
            bEnd.setDate(bEnd.getDate() + 1);
        if (end > bStart && start < bEnd) {
            totalBreak += brk.duration;
        }
    }
    return totalBreak;
};
exports.isDuringBreak = isDuringBreak;
const setTimeOnDay = (dayDate, timeStrOrDate) => {
    const t = typeof timeStrOrDate === "string" ? (0, exports.parseTimeOnly)(timeStrOrDate) : new Date(timeStrOrDate);
    t.setFullYear(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());
    return t;
};
exports.setTimeOnDay = setTimeOnDay;
//# sourceMappingURL=planningHelper.js.map