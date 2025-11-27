"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeShiftField = exports.setTimeOnDay = exports.isDuringBreak = exports.parseTimeOnly = exports.getWorkShift = exports.formatDate = exports.addDays = exports.addMinutes = exports.formatTimeToHHMMSS = exports.getDbPlanningByField = exports.getPlanningBoxByField = exports.getPlanningByField = void 0;
const sequelize_1 = require("sequelize");
const order_1 = require("../../../models/order/order");
const customer_1 = require("../../../models/customer/customer");
const planningBox_1 = require("../../../models/planning/planningBox");
const cacheManager_1 = require("../cacheManager");
const redisCache_1 = __importDefault(require("../../../configs/redisCache"));
const appError_1 = require("../../appError");
const dashboardRepository_1 = require("../../../repository/dashboardRepository");
const normalizeVN_1 = require("../normalizeVN");
const planningRepository_1 = require("../../../repository/planningRepository");
//get planningPaper properties
const getPlanningByField = async ({ cacheKey, keyword, getFieldValue, whereCondition, message, isBox = false, }) => {
    try {
        const lowerKeyword = keyword?.toLowerCase?.() || "";
        let allData = await redisCache_1.default.get(cacheKey);
        let sourceMessage = "";
        if (!allData) {
            allData = isBox
                ? await planningRepository_1.planningRepository.getPlanningBoxSearch(whereCondition)
                : await dashboardRepository_1.dashboardRepository.getDbPlanningSearch(whereCondition);
            await redisCache_1.default.set(cacheKey, JSON.stringify(allData), "EX", 900);
            sourceMessage = `Get ${cacheKey} from DB`;
        }
        else {
            allData = JSON.parse(allData);
            sourceMessage = message || `Get ${cacheKey} from cache`;
        }
        // Lọc dữ liệu
        const filteredData = allData.filter((item) => {
            const fieldValue = getFieldValue(item);
            return fieldValue != null
                ? (0, normalizeVN_1.normalizeVN)(String(fieldValue).toLowerCase()).includes((0, normalizeVN_1.normalizeVN)(lowerKeyword))
                : false;
        });
        return { message: sourceMessage, data: filteredData };
    }
    catch (error) {
        console.log(`error to get planning`, error);
        throw appError_1.AppError.ServerError();
    }
};
exports.getPlanningByField = getPlanningByField;
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
//get db planning by field
const getDbPlanningByField = async ({ cacheKey, keyword, getFieldValue, page, pageSize, message, }) => {
    const currentPage = Number(page) || 1;
    const currentPageSize = Number(pageSize) || 20;
    const lowerKeyword = keyword?.toLowerCase?.() || "";
    try {
        let allData = await redisCache_1.default.get(cacheKey);
        let sourceMessage = "";
        if (!allData) {
            allData = await dashboardRepository_1.dashboardRepository.getDbPlanningSearch();
            await redisCache_1.default.set(cacheKey, JSON.stringify(allData), "EX", 900);
            sourceMessage = `Get ${cacheKey} from DB`;
        }
        else {
            allData = JSON.parse(allData);
            sourceMessage = message || `Get ${cacheKey} from cache`;
        }
        // Lọc dữ liệu
        const filteredData = allData.filter((item) => {
            const fieldValue = getFieldValue(item);
            return fieldValue != null
                ? (0, normalizeVN_1.normalizeVN)(String(fieldValue).toLowerCase()).includes((0, normalizeVN_1.normalizeVN)(lowerKeyword))
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
    }
    catch (error) {
        console.log(`error to get planning`, error);
        throw appError_1.AppError.ServerError();
    }
};
exports.getDbPlanningByField = getDbPlanningByField;
const formatTimeToHHMMSS = (date) => {
    return date.toTimeString().split(" ")[0];
};
exports.formatTimeToHHMMSS = formatTimeToHHMMSS;
const addMinutes = (date, mins) => {
    const d = new Date(date);
    let totalMinutes = mins;
    while (true) {
        const end = new Date(d);
        end.setMinutes(end.getMinutes() + totalMinutes);
        const breakMinutes = (0, exports.isDuringBreak)(d, end);
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
const mergeShiftField = (currentValue, incoming) => {
    if (!incoming)
        return currentValue;
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
exports.mergeShiftField = mergeShiftField;
//# sourceMappingURL=planningHelper.js.map