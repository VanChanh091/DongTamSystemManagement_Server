import dayjs from "dayjs";
import { Op } from "sequelize";
import {
  ErrorStatMetric,
  MonthlyErrorReportInput,
  MonthlyErrorReportResponse,
  MonthlyErrorReportRow,
  YearlyErrorReportInput,
  YearlyErrorReportResponse,
  YearlyErrorReportRow,
} from "../../../interface/synthetic/errorProduction.type";
import { AppError } from "../../../utils/appError";
import { CacheKey } from "../../../utils/helper/cache/cacheKey";
import { dayjsUtc } from "../../../assets/configs/dayjs/dayjs.config";
import redisCache from "../../../assets/configs/connect/redis.connect";
import { syntheticReportRepository } from "../../../repository/synthetic/synthetic.reportRepository";

const devEnvironment = process.env.NODE_ENV !== "production";
const { reports } = CacheKey.synthetic;

const VN_TZ = "Asia/Ho_Chi_Minh";
const VN_TIMEZONE_OFFSET_MS = 25_200_000; // 7 tiếng
const TIMETTL = 7 * 24 * 60 * 60; // 7 ngày
const CACHETTL = 300; // 5 phút

export const statisticErrProductionService = {
  getMonthlyErrorReport: async (
    dto: MonthlyErrorReportInput,
  ): Promise<MonthlyErrorReportResponse> => {
    const { month, year, machine, employeeId, type } = dto;

    const nowVN = dayjsUtc().tz(VN_TZ);
    const currentYear = nowVN.year();
    const currentMonth = nowVN.month() + 1;

    // Kiểm tra xem tháng được chọn có phải là tháng cũ không
    const isPastMonth = year < currentYear || (year === currentYear && month < currentMonth);
    const ttl = isPastMonth ? TIMETTL : CACHETTL;

    // cache data
    const cacheKey = reports.error_monthly(year, month, type);

    const startOfMonth = dayjsUtc
      .tz(`${year}-${String(month).padStart(2, "0")}-01`, VN_TZ)
      .startOf("month");
    const endOfMonth = startOfMonth.endOf("month");
    const daysInMonth = startOfMonth.daysInMonth();

    try {
      // lấy thông tin nhân viên cần lọc
      let targetEmployeeName: string | null = null;
      if (employeeId && employeeId !== "all") {
        const emp = await syntheticReportRepository.getEmployeeErrorProduction(employeeId);
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

      const cached = await redisCache.get(cacheKey);
      if (cached) {
        if (devEnvironment) console.log("✅ Data Error Production Monthly from Redis");
        const masterReport: MonthlyErrorReportResponse = JSON.parse(cached);

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

      const mapGroup: Record<string, MonthlyErrorReportRow> = {};

      if (type === "paper") {
        const paperWhere: any = { shiftManagement: { [Op.and]: [{ [Op.ne]: null }] } };

        const [paperInspections, reportsData] = await Promise.all([
          syntheticReportRepository.getQcInspectionPaper({ paperWhere, startDate, endDate }),
          syntheticReportRepository.getReportPlanningPaper({
            startDate: reportStartDate,
            endDate: reportEndDate,
          }),
        ]);

        const reportMap = new Map<string, string>();
        for (let i = 0; i < reportsData.length; i++) {
          const r = reportsData[i];
          reportMap.set(`${r.planningId}_${r.shiftProduction}`, r.shiftManagement.trim());
        }

        for (let i = 0; i < paperInspections.length; i++) {
          const item = paperInspections[i];
          const checklist = item.checkList;
          if (!checklist) continue;

          let errorCount = 0;
          for (const k in checklist) {
            if (checklist[k] === false) errorCount++;
          }
          if (errorCount === 0) continue;

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
            } else {
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
      } else if (type === "box") {
        const boxWhere: any = { shiftManagement: { [Op.and]: [{ [Op.ne]: null }] } };

        const [boxInspections, reportsData] = await Promise.all([
          syntheticReportRepository.getQcInspectionBox({ boxWhere, startDate, endDate }),
          syntheticReportRepository.getReportPlanningBox({
            startDate: reportStartDate,
            endDate: reportEndDate,
          }),
        ]);

        const reportMap = new Map<string, string>();
        for (let i = 0; i < reportsData.length; i++) {
          const r = reportsData[i];
          const dateKey = getVnTimeDetails(r.dayReport).dateKey;
          reportMap.set(`${r.planningBoxId}_${dateKey}_${r.machine}`, r.shiftManagement.trim());
        }

        for (let i = 0; i < boxInspections.length; i++) {
          const item = boxInspections[i];
          const checklist = item.checkList;
          if (!checklist) continue;

          let errorCount = 0;
          for (const k in checklist) {
            if (checklist[k] === false) errorCount++;
          }
          if (errorCount === 0) continue;

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
      await redisCache.set(cacheKey, JSON.stringify(masterResponseData), "EX", ttl);

      return filterAndBuildResponse({
        allRows: allDataRows,
        daysInMonth,
        targetEmpName: targetEmployeeName,
        targetMachine: machine,
      });
    } catch (error) {
      console.error("Error getting monthly error report:", error);
      throw AppError.ServerError();
    }
  },

  getYearlyErrorReport: async (dto: YearlyErrorReportInput): Promise<YearlyErrorReportResponse> => {
    const { year, machine, employeeId, type } = dto;

    // cache data
    const cacheKey = reports.error_yearly(year, type);

    try {
      // 1. KIỂM TRA CACHE
      const cached = await redisCache.get(cacheKey);
      let masterRows: YearlyErrorReportRow[] | null = cached ? JSON.parse(cached) : null;

      // 2. NẾU CHƯA CÓ CACHE -> TÍNH TOÁN
      if (!masterRows) {
        const startOfYear = dayjsUtc.tz(`${year}-01-01`, VN_TZ).startOf("year");
        const endOfYear = startOfYear.endOf("year");
        const startDate = startOfYear.toDate();
        const endDate = endOfYear.toDate();
        const reportStartDate = startOfYear.subtract(1, "day").toDate();
        const reportEndDate = endOfYear.add(1, "day").toDate();

        type RawBucket = { errors: number; tonnage: number };
        const groupData = new Map<
          string,
          { machine: string; operator: string; months: Record<number, RawBucket> }
        >();

        const getRow = (mName: string, op: string) => {
          const key = `${mName}___${op}`;
          let row = groupData.get(key);
          if (!row) {
            const months: Record<number, RawBucket> = {};
            for (let i = 1; i <= 12; i++) months[i] = { errors: 0, tonnage: 0 };
            row = { machine: mName, operator: op, months };
            groupData.set(key, row);
          }
          return row;
        };

        if (type === "paper") {
          // Query song song 2 bảng
          const [inspections, reportsData] = await Promise.all([
            syntheticReportRepository.getQcInspectionPaper({
              paperWhere: {},
              startDate,
              endDate,
            }),
            syntheticReportRepository.getReportPlanningPaper({
              paperWhere: {},
              startDate: reportStartDate,
              endDate: reportEndDate,
            }),
          ]);

          // Lấy danh sách planningId duy nhất để chỉ query đúng các planningId cần thiết thay vì scan toàn bộ bảng
          const planningIds = Array.from(
            new Set(reportsData.map((r: any) => r.planningId).filter(Boolean)),
          );

          // Query paper requirements có điều kiện planningId
          const paperReqs =
            planningIds.length > 0
              ? await syntheticReportRepository.getPaperRequirement(planningIds)
              : [];

          // Map Tấn giấy từ DB
          const planningTonMap = new Map<number, number>(
            paperReqs.map((i: any) => [i.planningId, (Number(i.totalRequiredQty) || 0) / 1000]),
          );

          // Gom tổng sản lượng đơn và map ca trực
          const planningTotalQtyMap = new Map<number, number>();
          const shiftOperatorMap = new Map<string, string>();
          for (let i = 0; i < reportsData.length; i++) {
            const r = reportsData[i];
            planningTotalQtyMap.set(
              r.planningId,
              (planningTotalQtyMap.get(r.planningId) || 0) + (Number(r.qtyProduced) || 0),
            );
            shiftOperatorMap.set(
              `${r.planningId}___${r.shiftProduction}`,
              (r.shiftManagement || "").trim(),
            );
          }

          // Phân bổ Tấn giấy từ báo cáo ca
          for (let i = 0; i < reportsData.length; i++) {
            const r = reportsData[i];
            const op = r.shiftManagement?.trim();
            if (!op || op === "Chưa phân ca") continue;

            const totalPlanQty = planningTotalQtyMap.get(r.planningId) || 0;
            const totalPlanTons = planningTonMap.get(r.planningId) || 0;
            const shareTons =
              totalPlanQty > 0 ? ((Number(r.qtyProduced) || 0) / totalPlanQty) * totalPlanTons : 0;

            const repTime =
              r.dayReport instanceof Date ? r.dayReport.getTime() : new Date(r.dayReport).getTime();
            const month = new Date(repTime + VN_TIMEZONE_OFFSET_MS).getUTCMonth() + 1;

            getRow(r.PlanningPaper?.chooseMachine || "Chưa rõ máy", op).months[month].tonnage +=
              shareTons;
          }

          // Phân bổ Số lỗi từ QC
          for (let i = 0; i < inspections.length; i++) {
            const item = inspections[i];
            const cl = item.checkList;
            if (!cl) continue;

            let errorCount = 0;
            for (const k in cl) if (cl[k] === false) errorCount++;
            if (errorCount === 0) continue;

            const insTime =
              item.timeInspection instanceof Date
                ? item.timeInspection.getTime()
                : new Date(item.timeInspection).getTime();
            const d = new Date(insTime + VN_TIMEZONE_OFFSET_MS);
            const month = d.getUTCMonth() + 1;
            const shift = d.getUTCHours() >= 6 && d.getUTCHours() < 18 ? "Ca 1" : "Ca 2";

            const shifts = (item.PlanningPaper?.shiftManagement || "").split(/[,;/]+/);
            const op = (
              shiftOperatorMap.get(`${item.planningId}___${shift}`) ||
              (shift === "Ca 1" ? shifts[0] : shifts[1] || shifts[0])
            )?.trim();

            if (!op || op === "Chưa phân ca") continue;

            getRow(item.PlanningPaper?.chooseMachine || "Chưa rõ máy", op).months[month].errors +=
              errorCount;
          }
        } else if (type === "box") {
          const boxWhere: any = {};

          const [boxInspections, reportsData] = await Promise.all([
            syntheticReportRepository.getQcInspectionBox({ boxWhere, startDate, endDate }),
            syntheticReportRepository.getReportPlanningBox({
              startDate: reportStartDate,
              endDate: reportEndDate,
            }),
          ]);

          const reportMap = new Map<string, string>();
          const planningMachineMap = new Map<string, string>();

          for (let i = 0; i < reportsData.length; i++) {
            const r = reportsData[i];
            const { dateKey, month } = getVnTimeDetails(r.dayReport);
            let op = (r.shiftManagement || "").trim();
            if (!op || op === "Chưa phân ca") continue;

            const sepIdx = op.search(/[,;/]/);
            if (sepIdx !== -1) {
              op = op.split(/[,;/]+/)[0].trim();
            }

            const machineName = r.machine || "Chưa rõ máy";
            reportMap.set(`${r.planningBoxId}_${dateKey}_${machineName}`, op);
            planningMachineMap.set(`${r.planningBoxId}_${machineName}`, op);

            const qty = Number(r.qtyProduced) || 0;
            getRow(machineName, op).months[month].tonnage += qty;
          }

          for (let i = 0; i < boxInspections.length; i++) {
            const item = boxInspections[i];
            const cl = item.checkList;
            if (!cl) continue;

            let errorCount = 0;
            for (const k in cl) if (cl[k] === false) errorCount++;
            if (errorCount === 0) continue;

            const { month, dateKey } = getVnTimeDetails(item.timeInspection);
            const machineName = item.PlanningBoxTime?.machine || "Chưa rõ máy";
            const planningBoxId = item.PlanningBoxTime?.planningBoxId;

            let operator =
              reportMap.get(`${planningBoxId}_${dateKey}_${machineName}`) ||
              planningMachineMap.get(`${planningBoxId}_${machineName}`);

            if (!operator) {
              const raw = item.PlanningBoxTime?.shiftManagement || "Chưa phân ca";
              const sepIdx = raw.search(/[,;/]/);
              operator = (sepIdx !== -1 ? raw.split(/[,;/]+/)[0] : raw).trim();
            }

            if (!operator || operator === "Chưa phân ca") continue;

            getRow(machineName, operator).months[month].errors += errorCount;
          }
        }

        // Chuyển Map thành mảng Master
        masterRows = Array.from(groupData.values()).map((row) => {
          const monthlyMetrics: Record<number, ErrorStatMetric> = {};
          let totalErr = 0;
          let totalTon = 0;

          for (let m = 1; m <= 12; m++) {
            const { errors, tonnage } = row.months[m];
            monthlyMetrics[m] = calculateMetric(errors, tonnage);
            totalErr += errors;
            totalTon += tonnage;
          }

          return {
            machine: row.machine,
            employeeName: row.operator,
            monthlyMetrics,
            totalMetrics: calculateMetric(totalErr, totalTon),
          };
        });

        const isPastYear = year < dayjsUtc().tz(VN_TZ).year();
        const ttl = isPastYear ? TIMETTL : CACHETTL;
        await redisCache.set(cacheKey, JSON.stringify(masterRows), "EX", ttl);
      }

      // LỌC TRÊN RAM & TÍNH SUMMARY
      let targetName: string | null = null;
      if (employeeId && employeeId !== "all") {
        const emp = await syntheticReportRepository.getEmployeeErrorProduction(employeeId);
        targetName = emp?.fullName.trim().toLowerCase() || null;
      }

      let grandTotalError = 0;
      let grandTotalTonnage = 0;
      const filteredData: YearlyErrorReportRow[] = [];

      for (const row of masterRows) {
        if (machine && machine !== "all" && row.machine !== machine) continue;
        if (targetName && !row.employeeName.toLowerCase().includes(targetName)) continue;

        grandTotalError += row.totalMetrics.errorCount;
        grandTotalTonnage += row.totalMetrics.tonnage;
        filteredData.push(row);
      }

      const finalTotalTonnage = Number(grandTotalTonnage.toFixed(3));
      const averageErrorRate =
        finalTotalTonnage > 0
          ? Number(((grandTotalError / finalTotalTonnage) * 100).toFixed(2))
          : 0;

      return {
        message: cached
          ? "Get yearly error report from cache"
          : "Get yearly error report successfully",
        year,
        summary: { totalError: grandTotalError, totalTonnage: finalTotalTonnage, averageErrorRate },
        data: filteredData,
      };
    } catch (error) {
      console.error("Error getting yearly error report:", error);
      throw AppError.ServerError();
    }
  },
};

//helper
const getVnTimeDetails = (date: Date | string) => {
  // Từ 06:00 đến 17:59 là Ca ngày
  // Từ 18:00 đến 05:59 sáng hôm sau là Ca đêm

  const d = new Date(new Date(date).getTime() + VN_TIMEZONE_OFFSET_MS);
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  const hour = d.getUTCHours();
  const shift: "Ca 1" | "Ca 2" = hour >= 6 && hour < 18 ? "Ca 1" : "Ca 2";

  const yyyy = d.getUTCFullYear();
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  const dateKey = `${yyyy}-${mm}-${dd}`;

  return { month, day, hour, shift, dateKey };
};

const initDailyMap = (daysInMonth: number): Record<number, number> => {
  const map: Record<number, number> = {};
  for (let d = 1; d <= daysInMonth; d++) {
    map[d] = 0;
  }
  return map;
};

const filterAndBuildResponse = ({
  allRows,
  daysInMonth,
  targetEmpName,
  targetMachine,
  message = "Get monthly error report successfully",
}: {
  allRows: MonthlyErrorReportRow[];
  daysInMonth: number;
  targetEmpName: string | null;
  targetMachine?: string;
  message?: string;
}): MonthlyErrorReportResponse => {
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

/**
 * Tính toán bộ chỉ số lỗi và sản lượng
 * - tonnage: Làm tròn 3 chữ số thập phân (đơn vị: Tấn)
 * - errorRate: (Tổng lỗi / Tấn) * 1000, làm tròn 2 chữ số thập phân
 */
export const calculateMetric = (errors: number, tonnage: number): ErrorStatMetric => {
  const roundedTonnage = Number(tonnage.toFixed(3));
  const errorRate = roundedTonnage > 0 ? Number(((errors / roundedTonnage) * 100).toFixed(2)) : 0;

  return {
    errorCount: errors,
    tonnage: roundedTonnage,
    errorRate, // Ví dụ: 15.95 (trên UI Flutter chỉ cần thêm ký tự "%")
  };
};
