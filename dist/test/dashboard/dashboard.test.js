"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const redisCache_1 = __importDefault(require("../../assest/configs/redisCache"));
const cacheManager_1 = require("../../utils/helper/cacheManager");
const dashboardRepository_1 = require("../../repository/dashboardRepository");
const planningHelper_1 = require("../../utils/helper/modelHelper/planningHelper");
const excelExporter_1 = require("../../utils/helper/excelExporter");
const appError_1 = require("../../utils/appError");
const dashboardService_1 = require("../../service/dashboardService");
// =======================================================================
// MOCK MODULES – FULL, KHÔNG THIẾU NHƯ MẤY FILE TRƯỚC
// =======================================================================
// redis default export
jest.mock("../../configs/redisCache", () => ({
    __esModule: true,
    default: {
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn(),
        setex: jest.fn(),
    },
}));
// CacheManager keys + methods
jest.mock("../../utils/helper/cacheManager", () => ({
    CacheManager: {
        check: jest.fn(),
        clearDbPlanning: jest.fn(),
        clearDbPlanningDetail: jest.fn(),
        keys: {
            dashboard: {
                planning: {
                    all: (status, page) => `plan:${status}:${page}`,
                },
                details: {
                    all: (id) => `detail:${id}`,
                },
                search: "search-key",
            },
        },
    },
}));
jest.mock("../../repository/dashboardRepository");
jest.mock("../../utils/helper/modelHelper/planningHelper");
jest.mock("../../utils/helper/excelExporter");
const mockedRedis = redisCache_1.default;
const mockedCache = cacheManager_1.CacheManager;
// =======================================================================
describe("dashboardService", () => {
    beforeEach(() => jest.clearAllMocks());
    // ============================================================================
    // 1. getAllDashboardPlanning
    // ============================================================================
    test("getAllDashboardPlanning - lấy từ cache", async () => {
        mockedCache.check.mockResolvedValue({ isChanged: false });
        mockedRedis.get.mockResolvedValue(JSON.stringify({ data: ["cache-p1"] }));
        const result = await dashboardService_1.dashboardService.getAllDashboardPlanning(1, 20, "pending");
        expect(result.data[0]).toBe("cache-p1");
    });
    test("getAllDashboardPlanning - cache đổi → lấy DB", async () => {
        mockedCache.check.mockResolvedValue({ isChanged: true });
        mockedCache.clearDbPlanning.mockResolvedValue(true);
        dashboardRepository_1.dashboardRepository.getDbPlanningCount.mockResolvedValue(1);
        dashboardRepository_1.dashboardRepository.getAllDbPlanning.mockResolvedValue(["db-p1"]);
        mockedRedis.set.mockResolvedValue(true);
        const result = await dashboardService_1.dashboardService.getAllDashboardPlanning(1, 20, "pending");
        expect(result.data[0]).toBe("db-p1");
        expect(mockedRedis.set).toHaveBeenCalled();
    });
    test("getAllDashboardPlanning - DB lỗi -> ServerError", async () => {
        mockedCache.check.mockResolvedValue({ isChanged: true });
        dashboardRepository_1.dashboardRepository.getDbPlanningCount.mockRejectedValue(new Error("FAIL"));
        await expect(dashboardService_1.dashboardService.getAllDashboardPlanning(1, 20, "pending")).rejects.toThrow(appError_1.AppError);
    });
    // ============================================================================
    // 2. getDbPlanningDetail
    // ============================================================================
    test("getDbPlanningDetail - lấy từ cache", async () => {
        mockedCache.check.mockResolvedValue({ isChanged: false });
        mockedRedis.get.mockResolvedValue(JSON.stringify(["cached-detail"]));
        const r = await dashboardService_1.dashboardService.getDbPlanningDetail(10);
        expect(r.data[0]).toBe("cached-detail");
    });
    test("getDbPlanningDetail - lấy DB khi cache đổi", async () => {
        mockedCache.check.mockResolvedValue({ isChanged: true });
        mockedCache.clearDbPlanningDetail.mockResolvedValue(true);
        dashboardRepository_1.dashboardRepository.getDBPlanningDetail.mockResolvedValue({
            PlanningBox: {
                planningBoxId: 11,
                boxTimes: [{ machine: "X", toJSON: () => ({ machine: "X", a: 1 }) }],
            },
        });
        dashboardRepository_1.dashboardRepository.getAllTimeOverflow.mockResolvedValue([
            { machine: "X", overflow: true },
        ]);
        mockedRedis.set.mockResolvedValue(true);
        const result = await dashboardService_1.dashboardService.getDbPlanningDetail(10);
        expect(result.data[0].timeOverFlow).toEqual({ machine: "X", overflow: true });
    });
    test("getDbPlanningDetail - detail không tồn tại", async () => {
        mockedCache.check.mockResolvedValue({ isChanged: true });
        dashboardRepository_1.dashboardRepository.getDBPlanningDetail.mockResolvedValue(null);
        await expect(dashboardService_1.dashboardService.getDbPlanningDetail(99)).rejects.toThrow(appError_1.AppError);
    });
    // ============================================================================
    // 3. getDbPlanningByFields
    // ============================================================================
    test("getDbPlanningByFields - valid", async () => {
        planningHelper_1.getDbPlanningByField.mockResolvedValue({
            data: [{ planningId: 1 }],
        });
        dashboardRepository_1.dashboardRepository.getAllDbPlanning.mockResolvedValue([
            { planningId: 1, status: "pending" },
        ]);
        const r = await dashboardService_1.dashboardService.getDbPlanningByFields({
            field: "ghepKho",
            keyword: "A",
            page: 1,
            pageSize: 20,
        });
        expect(r.data[0].planningId).toBe(1);
    });
    test("getDbPlanningByFields - invalid field", async () => {
        await expect(dashboardService_1.dashboardService.getDbPlanningByFields({
            field: "????",
            keyword: "x",
            page: 1,
            pageSize: 20,
        })).rejects.toThrow(appError_1.AppError);
    });
    // ============================================================================
    // 4. exportExcelDbPlanning
    // ============================================================================
    test("exportExcelDbPlanning - export thành công", async () => {
        dashboardRepository_1.dashboardRepository.exportExcelDbPlanning.mockResolvedValue([
            {
                toJSON: () => ({ id: 1 }),
                PlanningBox: {
                    planningBoxId: 1,
                    boxTimes: [{ machine: "X", toJSON: () => ({ machine: "X", a: 1 }) }],
                },
                Order: {},
            },
        ]);
        dashboardRepository_1.dashboardRepository.getAllTimeOverflow.mockResolvedValue([
            { machine: "X", b: 2 },
        ]);
        const res = {
            setHeader: jest.fn(),
            end: jest.fn(),
        };
        await dashboardService_1.dashboardService.exportExcelDbPlanning({ body: {} }, res);
        expect(excelExporter_1.exportExcelDbPlanning).toHaveBeenCalled();
    });
    // ============================================================================
    // 5. getAllDbPlanningStage
    // ============================================================================
    test("getAllDbPlanningStage - return formatted stage list", async () => {
        dashboardRepository_1.dashboardRepository.exportExcelDbPlanning.mockResolvedValue([
            {
                toJSON: () => ({ id: 1 }),
                PlanningBox: {
                    planningBoxId: 999,
                    boxTimes: [{ machine: "X", toJSON: () => ({ machine: "X" }) }],
                },
                Order: {},
            },
        ]);
        dashboardRepository_1.dashboardRepository.getAllTimeOverflow.mockResolvedValue([
            { machine: "X", overflow: true },
        ]);
        const result = await dashboardService_1.dashboardService.getAllDbPlanningStage();
        expect(result[0].stages[0].timeOverFlow.overflow).toBe(true);
    });
});
//# sourceMappingURL=dashboard.test.js.map