import { AppError } from "../../utils/appError";
import { CacheKey } from "../../utils/helper/cache/cacheKey";
import { PlanningPaper } from "../../models/planning/planningPaper";
import redisCache from "../../assets/configs/connect/redis.connect";
import { CacheManager } from "../../utils/helper/cache/cacheManager";
import { PaperRequirements } from "../../models/planning/requirement/paperRequirements";
import { paperRequirementRepo } from "../../repository/planning/paperRequirementRepository";
import { meiliClient } from "../../assets/configs/connect/meilisearch.connect";
import { Op } from "sequelize";

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

      //sắp xếp theo kế hoạch sx
      const sortedRows = applyPaperRequirementSort(requirements);

      // Tính toán summary qua Helper
      const summary = calculateRequirementsSummary(sortedRows);

      const responseData = {
        message: "Get paper requirements list successfully",
        data: sortedRows,
        ...summary,
      };

      await redisCache.set(cacheKey, JSON.stringify(responseData), "EX", 1800);

      return responseData;
    } catch (error) {
      console.error("❌ get paper requirements failed:", error);
      throw AppError.ServerError();
    }
  },

  getPaperRequirementByField: async ({
    machine,
    field,
    keyword,
  }: {
    machine: string;
    field: string;
    keyword: string;
  }) => {
    try {
      const cleanKeyword = keyword?.trim();
      if (!cleanKeyword) {
        return { message: "Keyword is empty", data: [], ...calculateRequirementsSummary([]) };
      }

      const validFields = ["orderId", "customerName", "ghepKho"];
      if (!validFields.includes(field)) {
        throw AppError.BadRequest(`Field '${field}' is not supported for search`, "INVALID_FIELD");
      }

      const index = meiliClient.index("planningPapers");
      const filterStatus = ["planning", "lackQty", "producing", "requested"];

      const searchResult = await index.search(keyword, {
        attributesToSearchOn: [field],
        attributesToRetrieve: ["planningId"],
        filter: `chooseMachine = "${machine}" AND status IN ${JSON.stringify(filterStatus)}`,
        limit: 100,
      });

      const planningIds = searchResult.hits.map((hit: any) => hit.planningId);
      if (!planningIds || planningIds.length === 0) {
        return { message: "No planning papers found", data: [] };
      }

      //query db
      const option = paperRequirementRepo.buildPaperRequirementsOptions({
        machine,
        whereCondition: { planningId: { [Op.in]: planningIds } },
      });
      const requirements = await PaperRequirements.findAll(option);

      //map planningId to requirement for quick lookup
      const reqMap = new Map(requirements.map((item) => [item.planningId, item]));
      const finalData = planningIds
        .map((id) => reqMap.get(id))
        .filter((item): item is NonNullable<typeof item> => Boolean(item));

      // Tính tổng trực tiếp và làm tròn 2 chữ số thập phân
      const summary = calculateRequirementsSummary(finalData);

      return {
        message: `Search by ${field} from Meilisearch & DB`,
        data: finalData,
        ...summary,
      };
    } catch (error) {
      console.error(`Failed to get paper requirements by ${field}`, error);
      if (error instanceof AppError) throw error;
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

//calculate summary by ghepKho
export interface GhepKhoSummary {
  ghepKho: number | string;
  totalQty: number;
  totalPrice: number;
  count: number;
}

export const calculateRequirementsSummary = (
  items: any[],
): {
  totalRecords: number;
  totalRequiredQty: number;
  totalPrice: number;
  summaryByGhepKho: GhepKhoSummary[];
} => {
  if (!items || items.length === 0) {
    return {
      totalRecords: 0,
      totalRequiredQty: 0,
      totalPrice: 0,
      summaryByGhepKho: [],
    };
  }

  let rawTotalQty = 0;
  let rawTotalPrice = 0;

  const ghepKhoMap = new Map<
    number | string,
    { totalQty: number; totalPrice: number; count: number }
  >();

  for (const item of items) {
    const qty = Number(item.totalRequiredQty) || 0;
    const price = Number(item.PlanningPaper?.totalPrice) || 0;

    rawTotalQty += qty;
    rawTotalPrice += price;

    const ghepKho = item.PlanningPaper?.ghepKho ?? item.planningPaper?.ghepKho ?? "Unknown";

    const current = ghepKhoMap.get(ghepKho) || {
      totalQty: 0,
      totalPrice: 0,
      count: 0,
    };

    current.totalQty += qty;
    current.totalPrice += price;
    current.count += 1;

    ghepKhoMap.set(ghepKho, current);
  }

  const totalRequiredQty = Math.round((rawTotalQty + Number.EPSILON) * 100) / 100;
  const totalPrice = Math.round((rawTotalPrice + Number.EPSILON) * 100) / 100;

  const summaryByGhepKho: GhepKhoSummary[] = Array.from(ghepKhoMap.entries()).map(
    ([ghepKho, data]) => ({
      ghepKho,
      totalQty: Math.round((data.totalQty + Number.EPSILON) * 100) / 100,
      totalPrice: Math.round((data.totalPrice + Number.EPSILON) * 100) / 100,
      count: data.count,
    }),
  );

  return {
    totalRecords: items.length,
    totalRequiredQty,
    totalPrice,
    summaryByGhepKho,
  };
};
