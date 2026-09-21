"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.paperRequirementService = void 0;
const appError_1 = require("../../utils/appError");
const cacheKey_1 = require("../../utils/helper/cache/cacheKey");
const planningPaper_1 = require("../../models/planning/planningPaper");
const redis_connect_1 = __importDefault(require("../../assets/configs/connect/redis.connect"));
const cacheManager_1 = require("../../utils/helper/cache/cacheManager");
const paperRequirements_1 = require("../../models/planning/requirement/paperRequirements");
const paperRequirementRepository_1 = require("../../repository/planning/paperRequirementRepository");
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
            await redis_connect_1.default.set(cacheKey, JSON.stringify(responseData), "EX", 1800);
            return responseData;
        }
        catch (error) {
            console.error("❌ get paper requirements failed:", error);
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
//# sourceMappingURL=paperRequirementService.js.map