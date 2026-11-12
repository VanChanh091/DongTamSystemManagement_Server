import { AppError } from "../../../utils/appError";
import {
  productionReportRepository,
  RawProductionReportPaperRow,
} from "../../../repository/productionReportRepository";
import {
  accumulateReportData,
  calculateEarnedMinutes,
  createReportAccumulator,
  finalizeReportRow,
  getProductionDayBounds,
} from "../../../utils/helper/modelHelper/productionReportHelper";
import { calcPaperStageRevenue } from "../../../utils/helper/modelHelper/productionRevenueRule";
import {
  ProductionCombinedReportResult,
  ProductionReportItem,
  ReportAccumulator,
} from "../../../interface/synthetic/report.production.type";
import { dayjsUtc } from "../../../assets/configs/dayjs/dayjs.config";
import { CacheKey } from "../../../utils/helper/cache/cacheKey";
import redisCache from "../../../assets/configs/connect/redis.connect";

const devEnvironment = process.env.NODE_ENV !== "production";
const { reports } = CacheKey.synthetic;

const VN_TZ = "Asia/Ho_Chi_Minh";
const TIMETTL = 7 * 24 * 60 * 60; // 7 ngày
const CACHETTL = 300; // 5 phút

const mapQcErrorsToReports = (
  reportPapers: RawProductionReportPaperRow[],
  qcErrors: ReadonlyArray<{ planningId: number; timeInspection: Date | string }>,
): Map<number, number> => {
  const reportByPlanningMap = new Map<number, RawProductionReportPaperRow[]>();
  for (const r of reportPapers) {
    let list = reportByPlanningMap.get(r.planningId);
    if (!list) {
      list = [];
      reportByPlanningMap.set(r.planningId, list);
    }
    list.push(r);
  }

  const reportQcMap = new Map<number, number>();
  for (const qc of qcErrors) {
    const candidateReports = reportByPlanningMap.get(qc.planningId);
    if (!candidateReports || candidateReports.length === 0) continue;

    if (candidateReports.length === 1) {
      const repId = candidateReports[0].reportPaperId;
      reportQcMap.set(repId, (reportQcMap.get(repId) || 0) + 1);
      continue;
    }

    const qcTime = new Date(qc.timeInspection).getTime();
    let bestReport = candidateReports[0];
    let minDiff = Math.abs(new Date(bestReport.dayReport).getTime() - qcTime);

    for (let i = 1; i < candidateReports.length; i++) {
      const diff = Math.abs(new Date(candidateReports[i].dayReport).getTime() - qcTime);
      if (diff < minDiff) {
        minDiff = diff;
        bestReport = candidateReports[i];
      }
    }

    reportQcMap.set(
      bestReport.reportPaperId,
      (reportQcMap.get(bestReport.reportPaperId) || 0) + 1,
    );
  }

  return reportQcMap;
};

export const productionReportService = {
  getReportProduction: async ({ startDate, endDate }: { startDate: string; endDate?: string }) => {
    try {
      const finalEndDate = endDate || startDate;
      const { startDateTime } = getProductionDayBounds(startDate);
      const { endDateTime } = getProductionDayBounds(finalEndDate);

      const cacheKey = reports.report_production(startDate, finalEndDate);
      const cached = await redisCache.get(cacheKey);
      if (cached) {
        if (devEnvironment) console.log("✅ Data Report Paper Production from Redis");

        return {
          message: "Lấy báo cáo sản xuất từ cache",
          data: JSON.parse(cached) as ProductionCombinedReportResult,
        };
      }

      // Lấy dữ liệu báo cáo vận hành gốc
      const reportPapers = await productionReportRepository.getProductionReportPapers({
        startDateTime,
        endDateTime,
      });

      if (!reportPapers || reportPapers.length === 0) {
        const emptyData: ProductionCombinedReportResult = {
          machines: [],
          workers: [],
        };
        return {
          message: "Không có dữ liệu trong khoảng thời gian đã chọn",
          data: emptyData,
        };
      }

      // map planningId để lấy định mức giấy, phế liệu, lỗi QC
      const planningIds = [...new Set(reportPapers.map((r) => r.planningId))];

      // gọi song song các query
      const [paperReqs, scrapData, qcErrors, dayPlannings] = await Promise.all([
        productionReportRepository.getPaperRequirementsByPlanningIds({ planningIds }),
        productionReportRepository.getScrapReportsByDateRange({ startDateTime, endDateTime }),
        productionReportRepository.getQcErrorsByPlanningIds({ planningIds }),
        productionReportRepository.getMachinePlannedDurations({
          startDate,
          endDate: finalEndDate,
        }),
      ]);

      // Mapping tra cứu định mức giấy
      const paperReqMap = new Map<number, number>();
      paperReqs.forEach((item) => {
        const cur = paperReqMap.get(item.planningId) || 0;
        paperReqMap.set(item.planningId, cur + Number(item.totalRequiredQty || 0));
      });

      // Phân bổ lỗi QC chính xác cho từng reportPaper
      // Mỗi lỗi QC chỉ thuộc về duy nhất 1 reportPaper (tránh gán trùng khi planning có nhiều thợ/ca)
      const reportQcMap = mapQcErrorsToReports(reportPapers, qcErrors);

      const machineScrapMap = new Map<string, number>();
      const workerScrapMap = new Map<string, number>();

      scrapData.forEach((s) => {
        const qty = Number(s.totalQtyScrap || 0);
        if (s.machine) {
          machineScrapMap.set(s.machine, (machineScrapMap.get(s.machine) || 0) + qty);
        }
        if (s.reportedBy) {
          workerScrapMap.set(s.reportedBy, (workerScrapMap.get(s.reportedBy) || 0) + qty);
        }
      });

      const machinePlannedMinutesMap = new Map<string, number>();
      dayPlannings.forEach((p) => {
        const m = p.chooseMachine;
        machinePlannedMinutesMap.set(
          m,
          (machinePlannedMinutesMap.get(m) || 0) + (Number(p.plannedDuration) || 0),
        );
      });

      // Gom nhóm dữ liệu đồng thời cho Máy và Thợ
      const machineGroupMap = new Map<string, ReportAccumulator>();
      const workerGroupMap = new Map<string, ReportAccumulator>();
      let totalAllPaperKg = 0;

      for (const report of reportPapers) {
        const planning = report.PlanningPaper;
        const runningPlan = Number(planning?.runningPlan || 0);
        const reportQty = Number(report.qtyProduced || 0);
        const proRataRatio = runningPlan > 0 ? reportQty / runningPlan : 0;

        const totalReqKg = paperReqMap.get(report.planningId) || 0;
        const usedKg = totalReqKg * proRataRatio;
        totalAllPaperKg += usedKg;

        const earnedMinutes = calculateEarnedMinutes({
          reportQty,
          runningPlan,
          plannedDuration: planning?.plannedDuration,
          fallbackLength: Number(report.totalLength || 0),
          fallbackSpeed: Number(report.averageSpeed || 0),
        });

        const reportQcErrors = reportQcMap.get(report.reportPaperId) || 0;
        const paperStageRevenue = calcPaperStageRevenue(
          report.totalPrice,
          planning?.Order?.isBox,
        );

        // 1. Gom theo Máy
        const machineKey = planning?.chooseMachine || "Chưa xác định";
        if (!machineGroupMap.has(machineKey)) {
          machineGroupMap.set(machineKey, createReportAccumulator(machineKey));
        }
        accumulateReportData(machineGroupMap.get(machineKey)!, {
          paperKg: usedKg,
          length: Number(report.totalLength || 0),
          price: paperStageRevenue,
          duration: Number(report.durations || 0),
          earnedMinutes,
          speed: Number(report.averageSpeed || 0),
          qcErrors: reportQcErrors,
        });

        // 2. Gom theo Thợ
        const workerKey = report.shiftManagement || "Chưa xác định";
        if (!workerGroupMap.has(workerKey)) {
          workerGroupMap.set(workerKey, createReportAccumulator(workerKey));
        }
        accumulateReportData(workerGroupMap.get(workerKey)!, {
          paperKg: usedKg,
          length: Number(report.totalLength || 0),
          price: paperStageRevenue,
          duration: Number(report.durations || 0),
          earnedMinutes,
          speed: Number(report.averageSpeed || 0),
          qcErrors: reportQcErrors,
        });
      }

      // Tạo danh sách báo cáo Máy
      const machineRows: ProductionReportItem[] = [];
      for (const [key, data] of machineGroupMap.entries()) {
        const scrap = machineScrapMap.get(key) || 0;
        const plannedMin = machinePlannedMinutesMap.get(key) || 0;
        machineRows.push(finalizeReportRow(data, scrap, plannedMin));
      }

      // Tạo danh sách báo cáo Thợ
      const workerRows: ProductionReportItem[] = [];
      for (const [key, data] of workerGroupMap.entries()) {
        const scrap = workerScrapMap.get(key) || 0;
        workerRows.push(finalizeReportRow(data, scrap, undefined));
      }

      // Cân bằng làm tròn tổng tấn giấy (tránh lệch 0.01 do rounding giữa 2 bảng)
      const totalTargetPaperTon = Math.round((totalAllPaperKg / 1000) * 100) / 100;
      const reconcileTon = (rows: ProductionReportItem[]) => {
        const currentSum = Math.round(rows.reduce((s, r) => s + r.totalPaperTon, 0) * 100) / 100;
        const diff = Math.round((totalTargetPaperTon - currentSum) * 100) / 100;
        if (diff !== 0 && rows.length > 0) {
          const maxRow = rows.reduce(
            (max, r) => (r.totalPaperTon > max.totalPaperTon ? r : max),
            rows[0],
          );
          maxRow.totalPaperTon = Math.round((maxRow.totalPaperTon + diff) * 100) / 100;
        }
      };
      reconcileTon(machineRows);
      reconcileTon(workerRows);

      const resultData: ProductionCombinedReportResult = {
        machines: machineRows,
        workers: workerRows,
      };

      // Lưu vào cache
      const ttl = getReportCacheTTL(finalEndDate);
      await redisCache.set(cacheKey, JSON.stringify(resultData), "EX", ttl);

      return {
        message: "Lấy báo cáo sản xuất công đoạn 1 thành công",
        data: resultData,
      };
    } catch (error) {
      console.error("❌ Lỗi tính báo cáo sản xuất công đoạn 1:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  getProductionMultiYearComparison: async ({
    years,
    target = "machine",
    dimensionKey,
  }: {
    years: number[];
    target?: "machine" | "worker";
    dimensionKey?: string;
  }) => {
    try {
      const currentYear = new Date().getFullYear();
      const validYears = (years && years.length > 0 ? years : [currentYear])
        .map((y) => Number(y))
        .filter((y) => !isNaN(y) && y > 2000 && y < 2100);

      const targetMode: "machine" | "worker" = target === "worker" ? "worker" : "machine";
      const filterKey = dimensionKey && dimensionKey !== "Tất cả" ? dimensionKey.trim() : undefined;

      const resultByYear: Record<number, ProductionReportItem[]> = {};

      await Promise.all(
        validYears.map(async (year) => {
          const cacheKey = reports.report_production_compare(year, targetMode, filterKey);

          // Kiểm tra Cache Redis
          const cached = await redisCache.get(cacheKey);
          if (cached) {
            resultByYear[year] = JSON.parse(cached);
            return;
          }

          // Khung giờ sản xuất cả năm (06:00 ngày 01/01 -> 05:59:59 sáng ngày 01/01 năm sau)
          const startOfYear = `${year}-01-01`;
          const endOfYear = `${year}-12-31`;
          const { startDateTime } = getProductionDayBounds(startOfYear);
          const endDateTime = dayjsUtc.tz(`${endOfYear} 05:59:59`, VN_TZ).add(1, "day").toDate();

          const reportPapers = await productionReportRepository.getProductionReportPapers({
            startDateTime,
            endDateTime,
            filterMachine: targetMode === "machine" ? filterKey : undefined,
            filterWorker: targetMode === "worker" ? filterKey : undefined,
            raw: true,
            nest: true,
          });

          // Nếu năm chưa có dữ liệu sản xuất
          if (!reportPapers || reportPapers.length === 0) {
            const emptyMonths: ProductionReportItem[] = [];
            for (let m = 1; m <= 12; m++) {
              emptyMonths.push(
                finalizeReportRow(
                  createReportAccumulator(`Tháng ${m.toString().padStart(2, "0")}`),
                  0,
                  targetMode === "machine" ? 0 : undefined,
                ),
              );
            }
            resultByYear[year] = emptyMonths;

            return;
          }

          const planningIds = [...new Set(reportPapers.map((r) => r.planningId))];

          const [paperReqs, scrapData, qcErrors, dayPlannings] = await Promise.all([
            productionReportRepository.getPaperRequirementsByPlanningIds({ planningIds }),
            productionReportRepository.getScrapReportsByDateRange({
              startDateTime,
              endDateTime,
              filterMachine: targetMode === "machine" ? filterKey : undefined,
              filterWorker: targetMode === "worker" ? filterKey : undefined,
            }),
            productionReportRepository.getQcErrorsByPlanningIds({ planningIds }),
            targetMode === "machine"
              ? productionReportRepository.getMachinePlannedDurations({
                  startDate: startOfYear,
                  endDate: endOfYear,
                  filterMachine: filterKey,
                })
              : Promise.resolve([]),
          ]);

          // Map định mức giấy
          const paperReqMap = new Map<number, number>();
          paperReqs.forEach((item: any) => {
            const cur = paperReqMap.get(item.planningId) || 0;
            paperReqMap.set(item.planningId, cur + Number(item.totalRequiredQty || 0));
          });

          // Khớp lỗi QC vào ca gần nhất
          const reportQcMap = mapQcErrorsToReports(reportPapers, qcErrors);

          // Khởi tạo accumulator cho 12 tháng
          const monthlyAccMap = new Map<number, ReportAccumulator>();
          for (let m = 1; m <= 12; m++) {
            monthlyAccMap.set(m, createReportAccumulator(`Tháng ${m.toString().padStart(2, "0")}`));
          }

          // Tích lũy số liệu sản xuất theo tháng ca
          for (const report of reportPapers) {
            const planning = report.PlanningPaper;
            const m = getShiftMonth(report.dayReport);
            const acc = monthlyAccMap.get(m);
            if (!acc) continue;

            const runningPlan = Number(planning?.runningPlan || 0);
            const reportQty = Number(report.qtyProduced || 0);
            const proRataRatio = runningPlan > 0 ? reportQty / runningPlan : 0;
            const usedKg = (paperReqMap.get(report.planningId) || 0) * proRataRatio;

            const earnedMinutes = calculateEarnedMinutes({
              reportQty,
              runningPlan,
              plannedDuration: planning?.plannedDuration,
              fallbackLength: Number(report.totalLength || 0),
              fallbackSpeed: Number(report.averageSpeed || 0),
            });

            const reportQcErrors = reportQcMap.get(report.reportPaperId) || 0;
            const paperStageRevenue = calcPaperStageRevenue(
              report.totalPrice,
              planning?.Order?.isBox,
            );

            accumulateReportData(acc, {
              paperKg: usedKg,
              length: Number(report.totalLength || 0),
              price: paperStageRevenue,
              duration: Number(report.durations || 0),
              earnedMinutes,
              speed: Number(report.averageSpeed || 0),
              qcErrors: reportQcErrors,
            });
          }

          // Gom phế liệu theo tháng ca
          const monthlyScrap = new Map<number, number>();
          scrapData.forEach((s: any) => {
            if (s.dayCompleted) {
              const m = getShiftMonth(s.dayCompleted);
              monthlyScrap.set(m, (monthlyScrap.get(m) || 0) + Number(s.totalQtyScrap || 0));
            }
          });

          // Gom kế hoạch phút theo tháng ca (chuẩn hóa đồng nhất)
          const monthlyPlanned = new Map<number, number>();
          if (targetMode === "machine") {
            dayPlannings.forEach((p: any) => {
              if (p.dayStart) {
                const m = getShiftMonth(p.dayStart);
                monthlyPlanned.set(
                  m,
                  (monthlyPlanned.get(m) || 0) + Number(p.plannedDuration || 0),
                );
              }
            });
          }

          // Hoàn thiện kết quả 12 tháng
          const monthsData: ProductionReportItem[] = [];
          for (let m = 1; m <= 12; m++) {
            const acc = monthlyAccMap.get(m)!;
            const scrap = monthlyScrap.get(m) || 0;
            const planned = targetMode === "machine" ? monthlyPlanned.get(m) : undefined;
            monthsData.push(finalizeReportRow(acc, scrap, planned));
          }

          resultByYear[year] = monthsData;

          // Cài đặt Cache: 30 ngày cho năm cũ, 5 phút (300s) cho năm hiện tại
          const isPastYear = year < currentYear;
          const cacheDuration = isPastYear ? 86400 * 30 : 300;
          await redisCache.set(cacheKey, JSON.stringify(monthsData), "EX", cacheDuration);
        }),
      );

      return {
        message: "Lấy báo cáo so sánh sản xuất thành công",
        data: {
          years: validYears,
          target: targetMode,
          dimensionKey: filterKey || "Tất cả",
          data: resultByYear,
        },
      };
    } catch (error) {
      console.error("❌ Lỗi tính báo cáo so sánh sản xuất đa năm:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },
};

export const getReportCacheTTL = (finalEndDate: string): number => {
  const { endDateTime } = getProductionDayBounds(finalEndDate);
  const now = dayjsUtc().tz(VN_TZ).toDate();

  // Đã đóng ca sản xuất hoàn toàn
  if (now > endDateTime) return TIMETTL;

  // Đang trong ngày sản xuất hiện tại
  return CACHETTL;
};

const getShiftMonth = (dateValue: Date | string | number): number => {
  const time = new Date(dateValue).getTime();
  return new Date(time + 3600000).getUTCMonth() + 1; // +1h vì: UTC+7 trừ 6h = UTC+1
};
