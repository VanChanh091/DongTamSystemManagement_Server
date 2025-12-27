import redisCache from "../../assest/configs/redisCache";
import { CacheManager } from "../../utils/helper/cacheManager";
import { dashboardRepository } from "../../repository/dashboardRepository";
import { getDbPlanningByField } from "../../utils/helper/modelHelper/planningHelper";
import { exportExcelDbPlanning } from "../../utils/helper/excelExporter";
import { AppError } from "../../utils/appError";
import { dashboardService } from "../../service/dashboardService";

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
          all: (status: string, page: number) => `plan:${status}:${page}`,
        },
        details: {
          all: (id: number) => `detail:${id}`,
        },
        search: "search-key",
      },
    },
  },
}));

jest.mock("../../repository/dashboardRepository");
jest.mock("../../utils/helper/modelHelper/planningHelper");
jest.mock("../../utils/helper/excelExporter");

const mockedRedis = redisCache as any;
const mockedCache = CacheManager as any;

// =======================================================================

describe("dashboardService", () => {
  beforeEach(() => jest.clearAllMocks());

  // ============================================================================
  // 1. getAllDashboardPlanning
  // ============================================================================
  test("getAllDashboardPlanning - lấy từ cache", async () => {
    mockedCache.check.mockResolvedValue({ isChanged: false });
    mockedRedis.get.mockResolvedValue(JSON.stringify({ data: ["cache-p1"] }));

    const result = await dashboardService.getAllDashboardPlanning(1, 20, "pending");
    expect(result.data[0]).toBe("cache-p1");
  });

  test("getAllDashboardPlanning - cache đổi → lấy DB", async () => {
    mockedCache.check.mockResolvedValue({ isChanged: true });
    mockedCache.clearDbPlanning.mockResolvedValue(true);

    (dashboardRepository.getDbPlanningCount as jest.Mock).mockResolvedValue(1);
    (dashboardRepository.getAllDbPlanning as jest.Mock).mockResolvedValue(["db-p1"]);

    mockedRedis.set.mockResolvedValue(true);

    const result = await dashboardService.getAllDashboardPlanning(1, 20, "pending");

    expect(result.data[0]).toBe("db-p1");
    expect(mockedRedis.set).toHaveBeenCalled();
  });

  test("getAllDashboardPlanning - DB lỗi -> ServerError", async () => {
    mockedCache.check.mockResolvedValue({ isChanged: true });
    (dashboardRepository.getDbPlanningCount as jest.Mock).mockRejectedValue(new Error("FAIL"));

    await expect(dashboardService.getAllDashboardPlanning(1, 20, "pending")).rejects.toThrow(
      AppError
    );
  });

  // ============================================================================
  // 2. getDbPlanningDetail
  // ============================================================================
  test("getDbPlanningDetail - lấy từ cache", async () => {
    mockedCache.check.mockResolvedValue({ isChanged: false });
    mockedRedis.get.mockResolvedValue(JSON.stringify(["cached-detail"]));

    const r = await dashboardService.getDbPlanningDetail(10);
    expect(r.data[0]).toBe("cached-detail");
  });

  test("getDbPlanningDetail - lấy DB khi cache đổi", async () => {
    mockedCache.check.mockResolvedValue({ isChanged: true });
    mockedCache.clearDbPlanningDetail.mockResolvedValue(true);

    (dashboardRepository.getDBPlanningDetail as jest.Mock).mockResolvedValue({
      PlanningBox: {
        planningBoxId: 11,
        boxTimes: [{ machine: "X", toJSON: () => ({ machine: "X", a: 1 }) }],
      },
    });

    (dashboardRepository.getAllTimeOverflow as jest.Mock).mockResolvedValue([
      { machine: "X", overflow: true },
    ]);

    mockedRedis.set.mockResolvedValue(true);

    const result = await dashboardService.getDbPlanningDetail(10);

    expect(result.data[0].timeOverFlow).toEqual({ machine: "X", overflow: true });
  });

  test("getDbPlanningDetail - detail không tồn tại", async () => {
    mockedCache.check.mockResolvedValue({ isChanged: true });

    (dashboardRepository.getDBPlanningDetail as jest.Mock).mockResolvedValue(null);

    await expect(dashboardService.getDbPlanningDetail(99)).rejects.toThrow(AppError);
  });

  // ============================================================================
  // 3. getDbPlanningByFields
  // ============================================================================
  test("getDbPlanningByFields - valid", async () => {
    (getDbPlanningByField as jest.Mock).mockResolvedValue({
      data: [{ planningId: 1 }],
    });

    (dashboardRepository.getAllDbPlanning as jest.Mock).mockResolvedValue([
      { planningId: 1, status: "pending" },
    ]);

    const r = await dashboardService.getDbPlanningByFields({
      field: "ghepKho",
      keyword: "A",
      page: 1,
      pageSize: 20,
    });

    expect(r.data[0].planningId).toBe(1);
  });

  test("getDbPlanningByFields - invalid field", async () => {
    await expect(
      dashboardService.getDbPlanningByFields({
        field: "????",
        keyword: "x",
        page: 1,
        pageSize: 20,
      })
    ).rejects.toThrow(AppError);
  });

  // ============================================================================
  // 4. exportExcelDbPlanning
  // ============================================================================
  test("exportExcelDbPlanning - export thành công", async () => {
    (dashboardRepository.exportExcelDbPlanning as jest.Mock).mockResolvedValue([
      {
        toJSON: () => ({ id: 1 }),
        PlanningBox: {
          planningBoxId: 1,
          boxTimes: [{ machine: "X", toJSON: () => ({ machine: "X", a: 1 }) }],
        },
        Order: {},
      },
    ]);

    (dashboardRepository.getAllTimeOverflow as jest.Mock).mockResolvedValue([
      { machine: "X", b: 2 },
    ]);

    const res = {
      setHeader: jest.fn(),
      end: jest.fn(),
    };

    await dashboardService.exportExcelDbPlanning({ body: {} } as any, res as any);

    expect(exportExcelDbPlanning).toHaveBeenCalled();
  });

  // ============================================================================
  // 5. getAllDbPlanningStage
  // ============================================================================
  test("getAllDbPlanningStage - return formatted stage list", async () => {
    (dashboardRepository.exportExcelDbPlanning as jest.Mock).mockResolvedValue([
      {
        toJSON: () => ({ id: 1 }),
        PlanningBox: {
          planningBoxId: 999,
          boxTimes: [{ machine: "X", toJSON: () => ({ machine: "X" }) }],
        },
        Order: {},
      },
    ]);

    (dashboardRepository.getAllTimeOverflow as jest.Mock).mockResolvedValue([
      { machine: "X", overflow: true },
    ]);

    const result = await dashboardService.getAllDbPlanningStage();

    expect(result[0].stages[0].timeOverFlow.overflow).toBe(true);
  });
});
