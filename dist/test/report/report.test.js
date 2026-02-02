"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const redisCache_1 = __importDefault(require("../../assest/configs/redisCache"));
const cacheManager_1 = require("../../utils/helper/cacheManager");
const reportRepository_1 = require("../../repository/reportRepository");
const reportHelper_1 = require("../../utils/helper/modelHelper/reportHelper");
const excelExporter_1 = require("../../utils/helper/excelExporter");
const appError_1 = require("../../utils/appError");
const reportService_1 = require("../../service/reportService");
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
                    all: (page) => `reportPaper:${page}`,
                },
                box: {
                    all: (page) => `reportBox:${page}`,
                },
            },
        },
    },
}));
jest.mock("../../repository/reportRepository");
jest.mock("../../utils/helper/modelHelper/reportHelper");
jest.mock("../../utils/helper/excelExporter");
const mockedRedis = redisCache_1.default;
const mockedCache = cacheManager_1.CacheManager;
describe("reportService", () => {
    beforeEach(() => jest.clearAllMocks());
    // ============================================================================
    // 1. getReportPaper
    // ============================================================================
    test("getReportPaper - lấy từ cache", async () => {
        mockedCache.check.mockResolvedValue({ isChanged: false });
        mockedRedis.get.mockResolvedValue(JSON.stringify({ data: ["P1"] }));
        const result = await reportService_1.reportService.getReportPaper("M1", 1, 20);
        expect(result.data[0]).toBe("P1");
    });
    test("getReportPaper - DB lỗi → ServerError", async () => {
        mockedCache.check.mockResolvedValue({ isChanged: true });
        reportRepository_1.reportRepository.reportCount.mockRejectedValue(new Error("DB FAIL"));
        await expect(reportService_1.reportService.getReportPaper("M1", 1, 20)).rejects.toThrow(appError_1.AppError);
    });
    // ============================================================================
    // 2. getReportPaperByField
    // ============================================================================
    test("getReportPaperByField - valid field", async () => {
        reportHelper_1.filterReportByField.mockResolvedValue({ data: ["Filtered"] });
        const result = await reportService_1.reportService.getReportPaperByField("customerName", "test", "M1", 1, 20);
        expect(result.data[0]).toBe("Filtered");
    });
    test("getReportPaperByField - invalid field → BadRequest", async () => {
        await expect(reportService_1.reportService.getReportPaperByField("xxx", "kw", "M1", 1, 20)).rejects.toThrow(appError_1.AppError);
    });
    // ============================================================================
    // 3. getReportBox
    // ============================================================================
    test("getReportBox - lấy từ cache", async () => {
        mockedCache.check.mockResolvedValue({ isChanged: false });
        mockedRedis.get.mockResolvedValue(JSON.stringify({ data: ["B1"] }));
        const result = await reportService_1.reportService.getReportBox("M1", 1, 20);
        expect(result.data[0]).toBe("B1");
    });
    test("getReportBox - cache đổi → lấy DB", async () => {
        mockedCache.check.mockResolvedValue({ isChanged: true });
        mockedCache.clearReportBox.mockResolvedValue(true);
        reportRepository_1.reportRepository.reportCount.mockResolvedValue(1);
        reportRepository_1.reportRepository.findAlReportBox.mockResolvedValue(["DB-B1"]);
        mockedRedis.set.mockResolvedValue(true);
        const result = await reportService_1.reportService.getReportBox("M1", 1, 20);
        expect(result.data[0]).toBe("DB-B1");
    });
    test("getReportBox - DB lỗi → ServerError", async () => {
        mockedCache.check.mockResolvedValue({ isChanged: true });
        reportRepository_1.reportRepository.reportCount.mockRejectedValue(new Error("DB FAIL"));
        await expect(reportService_1.reportService.getReportBox("M1", 1, 20)).rejects.toThrow(appError_1.AppError);
    });
    // ============================================================================
    // 4. getReportBoxByField
    // ============================================================================
    test("getReportBoxByField - valid field", async () => {
        reportHelper_1.filterReportByField.mockResolvedValue({ data: ["FilteredBox"] });
        const result = await reportService_1.reportService.getReportBoxByField("shiftManagement", "morning", "M1", 1, 20);
        expect(result.data[0]).toBe("FilteredBox");
    });
    test("getReportBoxByField - invalid field → BadRequest", async () => {
        await expect(reportService_1.reportService.getReportBoxByField("invalid", "kw", "M1", 1, 20)).rejects.toThrow(appError_1.AppError);
    });
    // ============================================================================
    // 5. exportReportPaper
    // ============================================================================
    test("exportReportPaper - export thành công", async () => {
        reportRepository_1.reportRepository.exportReportPaper.mockResolvedValue([{ id: 1 }]);
        const res = {
            setHeader: jest.fn(),
            end: jest.fn(),
        };
        await reportService_1.reportService.exportReportPaper(res, "2024-01-01", "2024-01-02", [], "M1");
        expect(excelExporter_1.exportExcelResponse).toHaveBeenCalled();
    });
    // ============================================================================
    // 6. exportReportBox
    // ============================================================================
    test("exportReportBox - export thành công", async () => {
        reportRepository_1.reportRepository.exportReportBox.mockResolvedValue([{ id: 2 }]);
        const res = {
            setHeader: jest.fn(),
            end: jest.fn(),
        };
        await reportService_1.reportService.exportReportBox(res, "2024-01-01", "2024-01-02", [], "M1");
        expect(excelExporter_1.exportExcelResponse).toHaveBeenCalled();
    });
});
//# sourceMappingURL=report.test.js.map