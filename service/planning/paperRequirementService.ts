import { AppError } from "../../utils/appError";
import { CacheKey } from "../../utils/helper/cache/cacheKey";
import { PlanningPaper } from "../../models/planning/planningPaper";
import redisCache from "../../assets/configs/connect/redis.connect";
import { CacheManager } from "../../utils/helper/cache/cacheManager";
import { PaperRequirements } from "../../models/planning/requirement/paperRequirements";
import { paperRequirementRepo } from "../../repository/planning/paperRequirementRepository";

const devEnvironment = process.env.NODE_ENV !== "production";
const { paperRequirement } = CacheKey.planning;

export const paperRequirementService = {
  getPaperRequirementsList: async ({ machine }: { machine: string }) => {
    try {
      const cacheKey = paperRequirement.machine(machine);

      const { isChanged } = await CacheManager.check(
        [{ model: PaperRequirements }, { model: PlanningPaper }],
        "paperRequirement",
      );

      //caching
      if (isChanged) {
        await CacheManager.clear("paperRequirement");
      } else {
        const cachedData = await redisCache.get(cacheKey);
        if (cachedData) {
          if (devEnvironment) console.log("✅ Data Paper Requirements from Redis");
          return {
            ...JSON.parse(cachedData),
            message: "Get paper requirements list from cache",
          };
        }
      }

      //get db
      const option = paperRequirementRepo.buildPaperRequirementsOptions({ machine });
      const requirements = await PaperRequirements.findAll(option);

      // Tính tổng trực tiếp từ kết quả trả về
      const rawTotal = requirements.reduce((sum, item) => sum + Number(item.totalRequiredQty), 0);

      // Làm tròn 2 chữ số thập phân
      const totalRequiredQty = Math.round((rawTotal + Number.EPSILON) * 100) / 100;

      //sắp xếp theo kế hoạch sx
      const sortedRows = applyPaperRequirementSort(requirements);

      const responseData = {
        message: "Get paper requirements list successfully",
        data: sortedRows,
        totalRecords: sortedRows.length,
        totalRequiredQty,
      };

      await redisCache.set(cacheKey, JSON.stringify(responseData), "EX", 1800);

      return responseData;
    } catch (error) {
      console.error("❌ get paper requirements failed:", error);
      throw AppError.ServerError();
    }
  },

  getLayersByRequirementId: async (requirementId: number) => {
    try {
      const layers = await paperRequirementRepo.getLayerRequirementsById(requirementId);
      if (layers.length === 0) {
        throw AppError.NotFound("No layers found", "NO_LAYERS_FOUND");
      }

      return { message: "Get layers by requirementId successfully", data: layers };
    } catch (error) {
      console.error("❌ get layers by requirement id failed:", error);
      throw AppError.ServerError();
    }
  },
};

// Helper: Sắp xếp PaperRequirements theo đúng thứ tự Planning (sortPlanning ASC -> ghepKho DESC)
const applyPaperRequirementSort = (data: any[]) => {
  const withSort = data.filter(
    (item: any) =>
      item.PlanningPaper?.sortPlanning !== null && item.PlanningPaper?.sortPlanning !== undefined,
  );
  const noSort = data.filter(
    (item: any) =>
      item.PlanningPaper?.sortPlanning === null || item.PlanningPaper?.sortPlanning === undefined,
  );

  // Đơn đã có sortPlanning: Sắp tăng dần
  withSort.sort(
    (a, b) => (a.PlanningPaper?.sortPlanning ?? 0) - (b.PlanningPaper?.sortPlanning ?? 0),
  );

  // Đơn chưa có sortPlanning: Sắp giảm dần theo ghepKho
  noSort.sort((a, b) => (b.PlanningPaper?.ghepKho ?? 0) - (a.PlanningPaper?.ghepKho ?? 0));

  return [...withSort, ...noSort];
};
