import redisCache from "../../assest/configs/redisCache";
import { CacheManager } from "../../utils/helper/cacheManager";
import { reportRepository } from "../../repository/reportRepository";
import { filterReportByField } from "../../utils/helper/modelHelper/reportHelper";
import { exportExcelResponse } from "../../utils/helper/excelExporter";
import { AppError } from "../../utils/appError";
import { reportService } from "../../service/reportService";

// ---------------- MOCK MODULES ----------------
jest.mock("../../configs/redisCache", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    setex: jest.fn(),
  },
}));

jest.mock("../../utils/helper/cacheManager", () => ({
  CacheManager: {
    check: jest.fn(),
    clearReportPaper: jest.fn(),
    clearReportBox: jest.fn(),
    keys: {
      report: {
        paper: {
          all: (page: number) => `reportPaper:${page}`,
        },
        box: {
          all: (page: number) => `reportBox:${page}`,
        },
      },
    },
  },
}));

jest.mock("../../repository/reportRepository");
jest.mock("../../utils/helper/modelHelper/reportHelper");
jest.mock("../../utils/helper/excelExporter");

const mockedRedis = redisCache as any;
const mockedCache = CacheManager as any;

describe("reportService", () => {
  beforeEach(() => jest.clearAllMocks());

  // ============================================================================
  // 1. getReportPaper
  // ============================================================================
  test("getReportPaper - lấy từ cache", async () => {
    mockedCache.check.mockResolvedValue({ isChanged: false });
    mockedRedis.get.mockResolvedValue(JSON.stringify({ data: ["P1"] }));

    const result = await reportService.getReportPaper("M1", 1, 20);
    expect(result.data[0]).toBe("P1");
  });

  test("getReportPaper - DB lỗi → ServerError", async () => {
    mockedCache.check.mockResolvedValue({ isChanged: true });

    (reportRepository.reportCount as jest.Mock).mockRejectedValue(new Error("DB FAIL"));

    await expect(reportService.getReportPaper("M1", 1, 20)).rejects.toThrow(AppError);
  });

  // ============================================================================
  // 2. getReportPaperByField
  // ============================================================================
  test("getReportPaperByField - valid field", async () => {
    (filterReportByField as jest.Mock).mockResolvedValue({ data: ["Filtered"] });

    const result = await reportService.getReportPaperByField("customerName", "test", "M1", 1, 20);

    expect(result.data[0]).toBe("Filtered");
  });

  test("getReportPaperByField - invalid field → BadRequest", async () => {
    await expect(reportService.getReportPaperByField("xxx", "kw", "M1", 1, 20)).rejects.toThrow(
      AppError,
    );
  });

  // ============================================================================
  // 3. getReportBox
  // ============================================================================
  test("getReportBox - lấy từ cache", async () => {
    mockedCache.check.mockResolvedValue({ isChanged: false });
    mockedRedis.get.mockResolvedValue(JSON.stringify({ data: ["B1"] }));

    const result = await reportService.getReportBox("M1", 1, 20);
    expect(result.data[0]).toBe("B1");
  });

  test("getReportBox - cache đổi → lấy DB", async () => {
    mockedCache.check.mockResolvedValue({ isChanged: true });
    mockedCache.clearReportBox.mockResolvedValue(true);

    (reportRepository.reportCount as jest.Mock).mockResolvedValue(1);
    (reportRepository.findAlReportBox as jest.Mock).mockResolvedValue(["DB-B1"]);

    mockedRedis.set.mockResolvedValue(true);

    const result = await reportService.getReportBox("M1", 1, 20);
    expect(result.data[0]).toBe("DB-B1");
  });

  test("getReportBox - DB lỗi → ServerError", async () => {
    mockedCache.check.mockResolvedValue({ isChanged: true });

    (reportRepository.reportCount as jest.Mock).mockRejectedValue(new Error("DB FAIL"));

    await expect(reportService.getReportBox("M1", 1, 20)).rejects.toThrow(AppError);
  });

  // ============================================================================
  // 4. getReportBoxByField
  // ============================================================================
  test("getReportBoxByField - valid field", async () => {
    (filterReportByField as jest.Mock).mockResolvedValue({ data: ["FilteredBox"] });

    const result = await reportService.getReportBoxByField(
      "shiftManagement",
      "morning",
      "M1",
      1,
      20,
    );

    expect(result.data[0]).toBe("FilteredBox");
  });

  test("getReportBoxByField - invalid field → BadRequest", async () => {
    await expect(reportService.getReportBoxByField("invalid", "kw", "M1", 1, 20)).rejects.toThrow(
      AppError,
    );
  });

  // ============================================================================
  // 5. exportReportPaper
  // ============================================================================
  test("exportReportPaper - export thành công", async () => {
    (reportRepository.exportReportPaper as jest.Mock).mockResolvedValue([{ id: 1 }]);

    const res = {
      setHeader: jest.fn(),
      end: jest.fn(),
    } as any;

    await reportService.exportReportPaper(res, "2024-01-01", "2024-01-02", [], "M1");
    expect(exportExcelResponse).toHaveBeenCalled();
  });

  // ============================================================================
  // 6. exportReportBox
  // ============================================================================
  test("exportReportBox - export thành công", async () => {
    (reportRepository.exportReportBox as jest.Mock).mockResolvedValue([{ id: 2 }]);

    const res = {
      setHeader: jest.fn(),
      end: jest.fn(),
    } as any;

    await reportService.exportReportBox(res, "2024-01-01", "2024-01-02", [], "M1");
    expect(exportExcelResponse).toHaveBeenCalled();
  });
});
