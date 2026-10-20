import { AppError } from "../../../utils/appError";
import { productionReportRepository } from "../../../repository/productionReportRepository";
import {
  accumulateReportData,
  calculateEarnedMinutes,
  createReportAccumulator,
  finalizeReportRow,
  getProductionDayBounds,
} from "../../../utils/helper/modelHelper/productionReportHelper";
import {
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

export const productionReportService = {
  getReportProduction: async ({
    startDate,
    endDate,
    type,
  }: {
    startDate: string;
    endDate?: string;
    type: "machine" | "worker";
  }) => {
    try {
      const finalEndDate = endDate || startDate;
      const { startDateTime } = getProductionDayBounds(startDate);
      const { endDateTime } = getProductionDayBounds(finalEndDate);

      const cacheKey = reports.report_production(type, startDate, finalEndDate);
      const cached = await redisCache.get(cacheKey);
      if (cached) {
        if (devEnvironment) console.log("✅ Data Report Paper Production from Redis");

        return {
          message: `get report paper production by ${type} from cache`,
          data: JSON.parse(cached),
        };
      }

      // Lấy dữ liệu báo cáo vận hành gốc
      const reportPapers = await productionReportRepository.getProductionReportPapers({
        startDateTime,
        endDateTime,
      });

      if (!reportPapers || reportPapers.length === 0) {
        return {
          message: "Không có dữ liệu trong khoảng thời gian đã chọn",
          data: [],
        };
      }

      // map planningId để lấy định mức giấy, phế liệu, lỗi QC
      const planningIds = [...new Set(reportPapers.map((r) => r.planningId))];

      // gọi song song các query
      const [paperReqs, scrapData, qcErrors, dayPlannings] = await Promise.all([
        productionReportRepository.getPaperRequirementsByPlanningIds(planningIds),
        productionReportRepository.getScrapReportsByDateRange({ startDateTime, endDateTime }),
        productionReportRepository.getQcErrorsByPlanningIds(planningIds),
        type === "machine"
          ? productionReportRepository.getMachinePlannedDurations({
              startDate,
              endDate: finalEndDate,
            })
          : Promise.resolve([]),
      ]);

      // Mapping tra cứu nhanh
      const paperReqMap = new Map<number, number>();
      paperReqs.forEach((item) => {
        const cur = paperReqMap.get(item.planningId) || 0;
        paperReqMap.set(item.planningId, cur + Number(item.totalRequiredQty || 0));
      });

      const qcErrorMap = new Map<number, number>();
      qcErrors.forEach((item) => {
        qcErrorMap.set(item.planningId, (qcErrorMap.get(item.planningId) || 0) + 1);
      });

      const scrapMap = new Map<string, number>();
      scrapData.forEach((s) => {
        const qty = Number(s.totalQtyScrap || 0);
        const key = type === "machine" ? s.machine : s.reportedBy;
        if (key) scrapMap.set(key, (scrapMap.get(key) || 0) + qty);
      });

      const machinePlannedMinutesMap = new Map<string, number>();
      if (type === "machine") {
        dayPlannings.forEach((p) => {
          const m = p.chooseMachine;
          machinePlannedMinutesMap.set(
            m,
            (machinePlannedMinutesMap.get(m) || 0) + (Number(p.plannedDuration) || 0),
          );
        });
      }

      // Gom nhóm dữ liệu theo Máy hoặc Thợ
      const groupMap = new Map<string, ReportAccumulator>();
      const processedPlanningQc = new Set<string>();

      for (const report of reportPapers) {
        const planning = report.PlanningPaper;
        const groupKey =
          type === "machine"
            ? planning?.chooseMachine || "Chưa xác định"
            : report.shiftManagement || "Chưa xác định";

        const runningPlan = Number(planning?.runningPlan || 0);
        const reportQty = Number(report.qtyProduced || 0);
        const proRataRatio = runningPlan > 0 ? reportQty / runningPlan : 0;

        const totalReqKg = paperReqMap.get(report.planningId) || 0;
        const usedKg = totalReqKg * proRataRatio;

        const earnedMinutes = calculateEarnedMinutes({
          reportQty,
          runningPlan,
          plannedDuration: planning?.plannedDuration,
          fallbackLength: Number(report.totalLength || 0),
          fallbackSpeed: Number(report.averageSpeed || 0),
        });

        // Tính toán số lỗi QC cho báo cáo này
        const planQcKey = `${groupKey}_${report.planningId}`;
        let errorsForThisReport = 0;
        if (!processedPlanningQc.has(planQcKey)) {
          processedPlanningQc.add(planQcKey);
          errorsForThisReport = qcErrorMap.get(report.planningId) || 0;
        }

        const reportPayload = {
          paperKg: usedKg,
          length: Number(report.totalLength || 0),
          price: Number(report.totalPrice || 0),
          duration: Number(report.durations || 0),
          earnedMinutes,
          speed: Number(report.averageSpeed || 0),
          qcErrors: errorsForThisReport,
        };

        if (!groupMap.has(groupKey)) {
          groupMap.set(groupKey, createReportAccumulator(groupKey));
        }
        accumulateReportData(groupMap.get(groupKey)!, reportPayload);
      }

      // Tạo danh sách báo cáo cuối cùng
      const reportRows: ProductionReportItem[] = [];
      for (const [key, data] of groupMap.entries()) {
        const scrap = scrapMap.get(key) || 0;
        const plannedMin = type === "machine" ? machinePlannedMinutesMap.get(key) || 0 : undefined;
        reportRows.push(finalizeReportRow(data, scrap, plannedMin));
      }

      // Lưu vào cache
      const ttl = getReportCacheTTL(finalEndDate);
      await redisCache.set(cacheKey, JSON.stringify(reportRows), "EX", ttl);

      return {
        message: `Lấy báo cáo sản xuất theo ${type === "machine" ? "máy" : "thợ"} thành công`,
        data: reportRows,
      };
    } catch (error) {
      console.error("❌ Lỗi tính báo cáo sản xuất công đoạn 1:", error);
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
