"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.statisticErrProductionService = void 0;
const sequelize_1 = require("sequelize");
const appError_1 = require("../../../utils/appError");
const cacheKey_1 = require("../../../utils/helper/cache/cacheKey");
const dayjs_config_1 = require("../../../assets/configs/dayjs/dayjs.config");
const redis_connect_1 = __importDefault(require("../../../assets/configs/connect/redis.connect"));
const synthetic_reportRepository_1 = require("../../../repository/synthetic/synthetic.reportRepository");
const devEnvironment = process.env.NODE_ENV !== "production";
const { reports } = cacheKey_1.CacheKey.synthetic;
const VN_TZ = "Asia/Ho_Chi_Minh";
const VN_TIMEZONE_OFFSET_MS = 25_200_000; // 7 tiếng
const TIMETTL = 7 * 24 * 60 * 60; // 7 ngày
const CACHETTL = 300; // 5 phút
exports.statisticErrProductionService = {
    getMonthlyErrorReport: async (dto) => {
        const { month, year, machine, employeeId, type } = dto;
        const nowVN = (0, dayjs_config_1.dayjsUtc)().tz(VN_TZ);
        const currentYear = nowVN.year();
        const currentMonth = nowVN.month() + 1;
        // Kiểm tra xem tháng được chọn có phải là tháng cũ không
        const isPastMonth = year < currentYear || (year === currentYear && month < currentMonth);
        const ttl = isPastMonth ? TIMETTL : CACHETTL;
        // cache data
        const cacheKey = reports.error_monthly(year, month, type);
        const startOfMonth = dayjs_config_1.dayjsUtc
            .tz(`${year}-${String(month).padStart(2, "0")}-01`, VN_TZ)
            .startOf("month");
        const endOfMonth = startOfMonth.endOf("month");
        const daysInMonth = startOfMonth.daysInMonth();
        try {
            // :ấy thông tin nhân viên cần lọc
            let targetEmployeeName = null;
            if (employeeId && employeeId !== "all") {
                const emp = await synthetic_reportRepository_1.syntheticReportRepository.getEmployeeErrorProduction(employeeId);
                if (!emp) {
                    return {
                        message: "Không tìm thấy nhân viên",
                        daysInMonth,
                        summary: { totalError: 0, dailyTotals: initDailyMap(daysInMonth) },
                        data: [],
                    };
                }
                targetEmployeeName = emp.fullName.trim().toLowerCase();
            }
            const cached = await redis_connect_1.default.get(cacheKey);
            if (cached) {
                if (devEnvironment)
                    console.log("✅ Data Error Production from Redis");
                const masterReport = JSON.parse(cached);
                return filterAndBuildResponse({
                    allRows: masterReport.data,
                    daysInMonth,
                    targetEmpName: targetEmployeeName,
                    targetMachine: machine,
                    message: "Get monthly error report from cache",
                });
            }
            // Nếu chưa có Cache: Query DB lấy toàn bộ dữ liệu tháng
            const startDate = startOfMonth.toDate();
            const endDate = endOfMonth.toDate();
            const reportStartDate = startOfMonth.subtract(1, "day").toDate();
            const reportEndDate = endOfMonth.add(1, "day").toDate();
            const mapGroup = {};
            if (type === "paper") {
                const paperWhere = { shiftManagement: { [sequelize_1.Op.and]: [{ [sequelize_1.Op.ne]: null }] } };
                const [paperInspections, reportsData] = await Promise.all([
                    synthetic_reportRepository_1.syntheticReportRepository.getQcInspectionPaper({ paperWhere, startDate, endDate }),
                    synthetic_reportRepository_1.syntheticReportRepository.getPlanningPaper({ reportStartDate, reportEndDate }),
                ]);
                const reportMap = new Map();
                for (let i = 0; i < reportsData.length; i++) {
                    const r = reportsData[i];
                    reportMap.set(`${r.planningId}_${r.shiftProduction}`, r.shiftManagement.trim());
                }
                for (let i = 0; i < paperInspections.length; i++) {
                    const item = paperInspections[i];
                    const checklist = item.checkList;
                    if (!checklist)
                        continue;
                    let errorCount = 0;
                    for (const k in checklist) {
                        if (checklist[k] === false)
                            errorCount++;
                    }
                    if (errorCount === 0)
                        continue;
                    const { day, shift } = getVnTimeDetails(item.timeInspection);
                    const machineName = item.PlanningPaper?.chooseMachine || "Chưa rõ máy";
                    const reportKey = `${item.planningId}_${shift}`;
                    let operator = reportMap.get(reportKey);
                    if (!operator) {
                        const fallbackShift = item.PlanningPaper?.shiftManagement || "Chưa phân ca";
                        const sepIdx = fallbackShift.search(/[,;/]/);
                        if (sepIdx !== -1) {
                            const parts = fallbackShift.split(/[,;/]+/);
                            operator = (shift === "Ca 1" ? parts[0] : parts[1] || parts[0]).trim();
                        }
                        else {
                            operator = fallbackShift.trim();
                        }
                    }
                    const rowKey = `${machineName}___${operator}`;
                    let row = mapGroup[rowKey];
                    if (!row) {
                        row = {
                            machine: machineName,
                            employeeName: operator,
                            dailyErrors: initDailyMap(daysInMonth),
                            totalErrors: 0,
                        };
                        mapGroup[rowKey] = row;
                    }
                    row.dailyErrors[day] += errorCount;
                    row.totalErrors += errorCount;
                }
            }
            else if (type === "box") {
                const boxWhere = { shiftManagement: { [sequelize_1.Op.and]: [{ [sequelize_1.Op.ne]: null }] } };
                const [boxInspections, reportsData] = await Promise.all([
                    synthetic_reportRepository_1.syntheticReportRepository.getQcInspectionBox({ boxWhere, startDate, endDate }),
                    synthetic_reportRepository_1.syntheticReportRepository.getPlanningBoxTime({ reportStartDate, reportEndDate }),
                ]);
                const reportMap = new Map();
                for (let i = 0; i < reportsData.length; i++) {
                    const r = reportsData[i];
                    const dateKey = getVnTimeDetails(r.dayReport).dateKey;
                    reportMap.set(`${r.planningBoxId}_${dateKey}_${r.machine}`, r.shiftManagement.trim());
                }
                for (let i = 0; i < boxInspections.length; i++) {
                    const item = boxInspections[i];
                    const checklist = item.checkList;
                    if (!checklist)
                        continue;
                    let errorCount = 0;
                    for (const k in checklist) {
                        if (checklist[k] === false)
                            errorCount++;
                    }
                    if (errorCount === 0)
                        continue;
                    const { day, dateKey } = getVnTimeDetails(item.timeInspection);
                    const machineName = item.PlanningBoxTime?.machine || "Chưa rõ máy";
                    const planningBoxId = item.PlanningBoxTime?.planningBoxId;
                    const reportKey = `${planningBoxId}_${dateKey}_${machineName}`;
                    let operator = reportMap.get(reportKey);
                    if (!operator) {
                        const raw = item.PlanningBoxTime?.shiftManagement || "Chưa phân ca";
                        const sepIdx = raw.search(/[,;/]/);
                        operator = (sepIdx !== -1 ? raw.split(/[,;/]+/)[0] : raw).trim();
                    }
                    const rowKey = `${machineName}___${operator}`;
                    let row = mapGroup[rowKey];
                    if (!row) {
                        row = {
                            machine: machineName,
                            employeeName: operator,
                            dailyErrors: initDailyMap(daysInMonth),
                            totalErrors: 0,
                        };
                        mapGroup[rowKey] = row;
                    }
                    row.dailyErrors[day] += errorCount;
                    row.totalErrors += errorCount;
                }
            }
            const allDataRows = Object.values(mapGroup);
            const masterResponseData = filterAndBuildResponse({
                allRows: allDataRows,
                daysInMonth,
                targetEmpName: null,
                targetMachine: "all",
            });
            await redis_connect_1.default.set(cacheKey, JSON.stringify(masterResponseData), "EX", ttl);
            return filterAndBuildResponse({
                allRows: allDataRows,
                daysInMonth,
                targetEmpName: targetEmployeeName,
                targetMachine: machine,
            });
        }
        catch (error) {
            console.error("Error getting monthly error report:", error);
            throw appError_1.AppError.ServerError();
        }
    },
    getYearlyErrorReport: async (dto) => { },
};
//helper
const getVnTimeDetails = (date) => {
    // Từ 06:00 đến 17:59 là Ca ngày
    // Từ 18:00 đến 05:59 sáng hôm sau là Ca đêm
    const d = new Date(new Date(date).getTime() + VN_TIMEZONE_OFFSET_MS);
    const day = d.getUTCDate();
    const hour = d.getUTCHours();
    const shift = hour >= 6 && hour < 18 ? "Ca 1" : "Ca 2";
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    const dateKey = `${yyyy}-${mm}-${dd}`;
    return { day, hour, shift, dateKey };
};
const initDailyMap = (daysInMonth) => {
    const map = {};
    for (let d = 1; d <= daysInMonth; d++) {
        map[d] = 0;
    }
    return map;
};
const filterAndBuildResponse = ({ allRows, daysInMonth, targetEmpName, targetMachine, message = "Get monthly error report successfully", }) => {
    const dailyTotals = initDailyMap(daysInMonth);
    let totalError = 0;
    const filteredData = allRows.filter((row) => {
        const matchMachine = !targetMachine || targetMachine === "all" || row.machine === targetMachine;
        const matchEmployee = !targetEmpName || row.employeeName.toLowerCase().includes(targetEmpName);
        return matchMachine && matchEmployee;
    });
    for (let i = 0; i < filteredData.length; i++) {
        const row = filteredData[i];
        totalError += row.totalErrors;
        for (let d = 1; d <= daysInMonth; d++) {
            dailyTotals[d] += row.dailyErrors[d] || 0;
        }
    }
    return {
        message,
        daysInMonth,
        summary: { totalError, dailyTotals },
        data: filteredData,
    };
};
//# sourceMappingURL=errProductionService.js.map