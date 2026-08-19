import { AppError } from "../../utils/appError";
import { PaperRequirements } from "../../models/planning/requirement/paperRequirements";
import { paperRequirementRepo } from "../../repository/planning/paperRequirementRepository";
import { PaperRequirementLayers } from "../../models/planning/requirement/paper_requirement_layers";
import { CacheKey } from "../../utils/helper/cache/cacheKey";
import { CacheManager } from "../../utils/helper/cache/cacheManager";
import { PlanningPaper } from "../../models/planning/planningPaper";
import redisCache from "../../assets/configs/connect/redis.connect";

const devEnvironment = process.env.NODE_ENV !== "production";
const { paperRequirement } = CacheKey.planning;

export const paperRequirementService = {
  getPaperRequirementsList: async ({
    page,
    pageSize,
    machine,
  }: {
    page: number;
    pageSize: number;
    machine: string;
  }) => {
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
            message: "Get paper requirements list successfully from cache",
          };
        }
      }

      //get db
      const option = paperRequirementRepo.buildPaperRequirementsOptions({
        page,
        pageSize,
        machine,
      });
      const { rows, count } = await PaperRequirements.findAndCountAll(option);

      const responseData = {
        message: "Get paper requirements list successfully",
        data: rows,
        totalOrders: count,
        totalPages: Math.ceil(count / pageSize),
        currentPage: page,
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
