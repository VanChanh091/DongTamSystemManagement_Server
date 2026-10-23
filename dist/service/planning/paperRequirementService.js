"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateRequirementsSummary = exports.paperRequirementService = void 0;
const appError_1 = require("../../utils/appError");
const cacheKey_1 = require("../../utils/helper/cache/cacheKey");
const planningPaper_1 = require("../../models/planning/planningPaper");
const redis_connect_1 = __importDefault(require("../../assets/configs/connect/redis.connect"));
const cacheManager_1 = require("../../utils/helper/cache/cacheManager");
const paperRequirements_1 = require("../../models/planning/requirement/paperRequirements");
const paperRequirementRepository_1 = require("../../repository/planning/paperRequirementRepository");
const meilisearch_connect_1 = require("../../assets/configs/connect/meilisearch.connect");
const sequelize_1 = require("sequelize");
const devEnvironment = process.env.NODE_ENV !== "production";
const { paperRequirement } = cacheKey_1.CacheKey.planning;
exports.paperRequirementService = {
    getPaperRequirementsList: async ({ machine }) => {
        try {
            const cacheKey = paperRequirement.machine(machine);
            const { isChanged } = await cacheManager_1.CacheManager.check([{ model: paperRequirements_1.PaperRequirements }, { model: planningPaper_1.PlanningPaper }], "paperRequirement");
            //caching
            if (isChanged) {
                await cacheManager_1.CacheManager.clear("paperRequirement");
            }
            else {
                const cachedData = await redis_connect_1.default.get(cacheKey);
                if (cachedData) {
                    if (devEnvironment)
                        console.log("✅ Data Paper Requirements from Redis");
                    return {
                        ...JSON.parse(cachedData),
                        message: "Get paper requirements list from cache",
                    };
                }
            }
            //get db
            const option = paperRequirementRepository_1.paperRequirementRepo.buildPaperRequirementsOptions({ machine });
            const requirements = await paperRequirements_1.PaperRequirements.findAll(option);
            //sắp xếp theo kế hoạch sx
            const sortedRows = applyPaperRequirementSort(requirements);
            // Tính toán summary qua Helper
            const summary = (0, exports.calculateRequirementsSummary)(sortedRows);
            const responseData = {
                message: "Get paper requirements list successfully",
                data: sortedRows,
                ...summary,
            };
            await redis_connect_1.default.set(cacheKey, JSON.stringify(responseData), "EX", 1800);
            return responseData;
        }
        catch (error) {
            console.error("❌ get paper requirements failed:", error);
            throw appError_1.AppError.ServerError();
        }
    },
    getPaperRequirementByField: async ({ machine, field, keyword, }) => {
        try {
            const cleanKeyword = keyword?.trim();
            if (!cleanKeyword) {
                return { message: "Keyword is empty", data: [], ...(0, exports.calculateRequirementsSummary)([]) };
            }
            const validFields = ["orderId", "customerName", "ghepKho"];
            if (!validFields.includes(field)) {
                throw appError_1.AppError.BadRequest(`Field '${field}' is not supported for search`, "INVALID_FIELD");
            }
            const index = meilisearch_connect_1.meiliClient.index("planningPapers");
            const filterStatus = ["planning", "lackQty", "producing", "requested"];
            const searchResult = await index.search(keyword, {
                attributesToSearchOn: [field],
                attributesToRetrieve: ["planningId"],
                filter: `chooseMachine = "${machine}" AND status IN ${JSON.stringify(filterStatus)}`,
                limit: 100,
            });
            const planningIds = searchResult.hits.map((hit) => hit.planningId);
            if (!planningIds || planningIds.length === 0) {
                return { message: "No planning papers found", data: [] };
            }
            //query db
            const option = paperRequirementRepository_1.paperRequirementRepo.buildPaperRequirementsOptions({
                machine,
                whereCondition: { planningId: { [sequelize_1.Op.in]: planningIds } },
            });
            const requirements = await paperRequirements_1.PaperRequirements.findAll(option);
            //map planningId to requirement for quick lookup
            const reqMap = new Map(requirements.map((item) => [item.planningId, item]));
            const finalData = planningIds
                .map((id) => reqMap.get(id))
                .filter((item) => Boolean(item));
            // Tính tổng trực tiếp và làm tròn 2 chữ số thập phân
            const summary = (0, exports.calculateRequirementsSummary)(finalData);
            return {
                message: `Search by ${field} from Meilisearch & DB`,
                data: finalData,
                ...summary,
            };
        }
        catch (error) {
            console.error(`Failed to get paper requirements by ${field}`, error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    getLayersByRequirementId: async (requirementId) => {
        try {
            const layers = await paperRequirementRepository_1.paperRequirementRepo.getLayerRequirementsById(requirementId);
            if (layers.length === 0) {
                throw appError_1.AppError.NotFound("No layers found", "NO_LAYERS_FOUND");
            }
            return { message: "Get layers by requirementId successfully", data: layers };
        }
        catch (error) {
            console.error("❌ get layers by requirement id failed:", error);
            throw appError_1.AppError.ServerError();
        }
    },
    // calculate summary by ghepKho
    calculateSummaryByGhepKho: async ({ ghepKho, machine, dayStart, }) => {
        try {
            const result = await paperRequirementRepository_1.paperRequirementRepo.sumTotalRequiredRequirement({
                ghepKho,
                machine,
                dayStart,
            });
            return {
                message: "Calculate summary by ghepKho successfully",
                data: Number(result?.totalQty || 0),
            };
        }
        catch (error) {
            console.error("❌ calculate summary by ghepKho failed:", error);
            throw appError_1.AppError.ServerError();
        }
    },
};
// Helper: Sắp xếp PaperRequirements theo đúng thứ tự Planning (sortPlanning ASC -> ghepKho DESC)
const applyPaperRequirementSort = (data) => {
    const withSort = data.filter((item) => item.PlanningPaper?.sortPlanning !== null && item.PlanningPaper?.sortPlanning !== undefined);
    const noSort = data.filter((item) => item.PlanningPaper?.sortPlanning === null || item.PlanningPaper?.sortPlanning === undefined);
    // Đơn đã có sortPlanning: Sắp tăng dần
    withSort.sort((a, b) => (a.PlanningPaper?.sortPlanning ?? 0) - (b.PlanningPaper?.sortPlanning ?? 0));
    // Đơn chưa có sortPlanning: Sắp giảm dần theo ghepKho
    noSort.sort((a, b) => (b.PlanningPaper?.ghepKho ?? 0) - (a.PlanningPaper?.ghepKho ?? 0));
    return [...withSort, ...noSort];
};
const calculateRequirementsSummary = (items) => {
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
    const ghepKhoMap = new Map();
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
    const summaryByGhepKho = Array.from(ghepKhoMap.entries()).map(([ghepKho, data]) => ({
        ghepKho,
        totalQty: Math.round((data.totalQty + Number.EPSILON) * 100) / 100,
        totalPrice: Math.round((data.totalPrice + Number.EPSILON) * 100) / 100,
        count: data.count,
    }));
    return {
        totalRecords: items.length,
        totalRequiredQty,
        totalPrice,
        summaryByGhepKho,
    };
};
exports.calculateRequirementsSummary = calculateRequirementsSummary;
//# sourceMappingURL=paperRequirementService.js.map