"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const redisCache_1 = __importDefault(require("../../assest/configs/redisCache"));
const cacheManager_1 = require("../../utils/helper/cacheManager");
const planningRepository_1 = require("../../repository/planningRepository");
const timeOverflowPlanning_1 = require("../../models/planning/timeOverflowPlanning");
const planningPaper_1 = require("../../models/planning/planningPaper");
const planningHelper_1 = require("../../utils/helper/modelHelper/planningHelper");
const appError_1 = require("../../utils/appError");
const planningPaperService_1 = require("../../service/planning/planningPaperService");
// ======================= MOCKS =======================
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
// CacheManager
jest.mock("../../utils/helper/cacheManager", () => ({
    CacheManager: {
        check: jest.fn(),
        clearPlanningPaper: jest.fn(),
        clearOrderAccept: jest.fn(),
        keys: {
            planning: {
                paper: {
                    machine: (m) => `planning:paper:${m}`,
                    search: (m) => `planning:paper:search:${m}`,
                },
            },
        },
    },
}));
jest.mock("../../repository/planningRepository");
jest.mock("../../models/planning/timeOverflowPlanning", () => ({
    timeOverflowPlanning: {
        findAll: jest.fn(),
    },
}));
jest.mock("../../models/planning/planningBox");
jest.mock("../../models/planning/planningBoxMachineTime");
jest.mock("../../models/order/order");
jest.mock("../../models/admin/machinePaper");
jest.mock("../../utils/helper/modelHelper/planningHelper", () => ({
    getPlanningByField: jest.fn(),
}));
jest.mock("../../service/planning/helper/timeRunningPaper", () => ({
    updateSortPlanning: jest.fn(),
    calculateTimeRunning: jest.fn(),
}));
const mockedRedis = redisCache_1.default;
const mockedCache = cacheManager_1.CacheManager;
const mockedRepo = planningRepository_1.planningRepository;
const mockedOverflow = timeOverflowPlanning_1.timeOverflowPlanning;
const commit = jest.fn();
const rollback = jest.fn();
planningPaper_1.PlanningPaper.sequelize = {
    transaction: jest.fn().mockResolvedValue({ commit, rollback }),
};
describe("planningPaperService", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    // =====================================================================
    // 1. getPlanningByMachine
    // =====================================================================
    test("getPlanningByMachine - lấy từ cache", async () => {
        mockedCache.check.mockResolvedValue({ isChanged: false });
        mockedRedis.get.mockResolvedValue(JSON.stringify([{ planningId: 1 }]));
        const rs = await planningPaperService_1.planningPaperService.getPlanningByMachine("M1");
        expect(rs.data[0].planningId).toBe(1);
        expect(mockedRedis.get).toHaveBeenCalled();
    });
    test("getPlanningByMachine - cache đổi → gọi getPlanningPaperSorted + lưu cache", async () => {
        mockedCache.check.mockResolvedValue({ isChanged: true });
        mockedCache.clearPlanningPaper.mockResolvedValue(true);
        const spySorted = jest
            .spyOn(planningPaperService_1.planningPaperService, "getPlanningPaperSorted")
            .mockResolvedValue([{ planningId: 2 }]);
        mockedRedis.set.mockResolvedValue(true);
        const rs = await planningPaperService_1.planningPaperService.getPlanningByMachine("M2");
        expect(spySorted).toHaveBeenCalledWith("M2");
        expect(rs.data[0].planningId).toBe(2);
        expect(mockedRedis.set).toHaveBeenCalled();
    });
    test("getPlanningByMachine - lỗi nội bộ → ServerError", async () => {
        mockedCache.check.mockResolvedValue({ isChanged: true });
        planningPaperService_1.planningPaperService.getPlanningPaperSorted = jest
            .fn()
            .mockRejectedValue(new Error("DB error"));
        await expect(planningPaperService_1.planningPaperService.getPlanningByMachine("M3")).rejects.toThrow(appError_1.AppError);
    });
    // =====================================================================
    // 2. getPlanningPaperSorted
    // =====================================================================
    test("getPlanningPaperSorted - sort + gộp overflow", async () => {
        const now = new Date();
        const planningWithOverflow = {
            planningId: 1,
            status: "planning",
            sortPlanning: 1,
            ghepKho: 5,
            Order: { flute: "5BC" },
            timeOverFlow: {
                overflowDayStart: now,
                overflowTimeRunning: 120,
                overflowDayCompleted: now,
            },
            timeRunning: 60,
            dayStart: now,
            runningPlan: 100,
            quantityManufacture: 100,
            toJSON() {
                return {
                    planningId: this.planningId,
                    status: this.status,
                    sortPlanning: this.sortPlanning,
                    ghepKho: this.ghepKho,
                    Order: this.Order,
                    runningPlan: this.runningPlan,
                    quantityManufacture: this.quantityManufacture,
                    timeOverFlow: this.timeOverFlow,
                };
            },
        };
        mockedRepo.getPlanningPaper.mockResolvedValue([planningWithOverflow]);
        const rs = await planningPaperService_1.planningPaperService.getPlanningPaperSorted("M1");
        // 1 đơn gốc + 1 overflow
        expect(rs.length).toBe(2);
        expect(rs[0].planningId).toBe(1);
        expect(rs[1].isOverflow).toBe(true);
        expect(rs[1].runningPlan).toBeUndefined();
    });
    // =====================================================================
    // 3. getPlanningByField
    // =====================================================================
    test("getPlanningByField - field hợp lệ → dùng helper + load full data", async () => {
        planningHelper_1.getPlanningByField.mockResolvedValue({
            data: [{ planningId: 10 }],
        });
        mockedRepo.getPlanningPaper.mockResolvedValue([{ planningId: 10 }]);
        const rs = await planningPaperService_1.planningPaperService.getPlanningByField("M1", "ghepKho", "ABC");
        expect(planningHelper_1.getPlanningByField).toHaveBeenCalled();
        expect(rs.data[0].planningId).toBe(10);
    });
    test("getPlanningByField - không có planningId → data rỗng", async () => {
        planningHelper_1.getPlanningByField.mockResolvedValue({
            data: [],
        });
        const rs = await planningPaperService_1.planningPaperService.getPlanningByField("M1", "ghepKho", "ABC");
        expect(rs.data.length).toBe(0);
    });
    test("getPlanningByField - field sai → BadRequest", async () => {
        await expect(planningPaperService_1.planningPaperService.getPlanningByField("M1", "???", "kw")).rejects.toThrow(appError_1.AppError);
    });
    // =====================================================================
    // 4. changeMachinePlanning
    // =====================================================================
    test("changeMachinePlanning - không tìm thấy planning → NotFound", async () => {
        mockedRepo.getPapersById.mockResolvedValue([]);
        await expect(planningPaperService_1.planningPaperService.changeMachinePlanning([1, 2], "M1")).rejects.toThrow(appError_1.AppError);
    });
    test("changeMachinePlanning - đổi máy thành công", async () => {
        const save = jest.fn().mockResolvedValue(true);
        mockedRepo.getPapersById.mockResolvedValue([
            { planningId: 1, chooseMachine: "OLD", sortPlanning: 5, save },
        ]);
        const rs = await planningPaperService_1.planningPaperService.changeMachinePlanning([1], "M-NEW");
        expect(save).toHaveBeenCalled();
        expect(rs.plannings[0].chooseMachine).toBe("M-NEW");
        expect(rs.plannings[0].sortPlanning).toBeNull();
    });
    // =====================================================================
    // 5. confirmCompletePlanningPaper
    // =====================================================================
    test("confirmCompletePlanningPaper - không có planning stop → BadRequest", async () => {
        mockedRepo.getStopByIds.mockResolvedValue([]);
        await expect(planningPaperService_1.planningPaperService.confirmCompletePlanningPaper([1])).rejects.toThrow(appError_1.AppError);
    });
    test("confirmCompletePlanningPaper - thiếu qty → LACK_QUANTITY", async () => {
        mockedRepo.getStopByIds.mockResolvedValue([{}]);
        mockedRepo.getPapersById.mockResolvedValue([
            { planningId: 1, qtyProduced: 50, runningPlan: 100 },
        ]);
        await expect(planningPaperService_1.planningPaperService.confirmCompletePlanningPaper([1])).rejects.toThrow(appError_1.AppError);
    });
    test("confirmCompletePlanningPaper - đủ qty → cập nhật status + overflow", async () => {
        mockedRepo.getStopByIds.mockResolvedValue([{}]);
        mockedRepo.getPapersById.mockResolvedValue([
            { planningId: 1, qtyProduced: 100, runningPlan: 100 },
        ]);
        mockedOverflow.findAll.mockResolvedValue([{ id: 1 }]);
        mockedRepo.updateDataModel.mockResolvedValue(true);
        const rs = await planningPaperService_1.planningPaperService.confirmCompletePlanningPaper([1]);
        expect(rs.message).toBe("planning paper updated successfully");
        expect(mockedRepo.updateDataModel).toHaveBeenCalled();
    });
    // =====================================================================
    // 6. pauseOrAcceptLackQtyPLanning
    // =====================================================================
    test("pauseOrAcceptLackQtyPLanning - không tìm thấy planning → NotFound", async () => {
        mockedRepo.getPapersById.mockResolvedValue([]);
        await expect(planningPaperService_1.planningPaperService.pauseOrAcceptLackQtyPLanning([1], "reject")).rejects.toThrow(appError_1.AppError);
    });
    test("pauseOrAcceptLackQtyPLanning - reject nhưng đã sản xuất → Conflict", async () => {
        mockedRepo.getPapersById.mockResolvedValue([
            { planningId: 1, orderId: "ORD1", qtyProduced: 10 },
        ]);
        mockedRepo.getModelById.mockResolvedValue({ orderId: "ORD1" });
        await expect(planningPaperService_1.planningPaperService.pauseOrAcceptLackQtyPLanning([1], "reject")).rejects.toThrow(appError_1.AppError);
    });
    test("pauseOrAcceptLackQtyPLanning - reject qty = 0 → xoá planning + box", async () => {
        const planningDestroy = jest.fn().mockResolvedValue(true);
        const boxDestroy = jest.fn().mockResolvedValue(true);
        mockedRepo.getPapersById.mockResolvedValue([
            { planningId: 1, orderId: "ORD1", qtyProduced: 0, destroy: planningDestroy },
        ]);
        mockedRepo.getModelById.mockResolvedValue({ orderId: "ORD1" });
        mockedRepo.getBoxByPlanningId.mockResolvedValue([
            { planningBoxId: 10, destroy: boxDestroy },
        ]);
        mockedRepo.deleteModelData.mockResolvedValue(true);
        mockedRepo.updateDataModel.mockResolvedValue(true);
        const rs = await planningPaperService_1.planningPaperService.pauseOrAcceptLackQtyPLanning([1], "reject", "reason");
        expect(rs.message).toBe("Update status planning successfully");
        expect(planningDestroy).toHaveBeenCalled();
        expect(boxDestroy).toHaveBeenCalled();
    });
    test("pauseOrAcceptLackQtyPLanning - complete + sortPlanning null → BadRequest", async () => {
        mockedRepo.getPapersById.mockResolvedValue([
            {
                planningId: 1,
                sortPlanning: null,
                qtyProduced: 100,
                hasOverFlow: false,
                save: jest.fn(),
            },
        ]);
        await expect(planningPaperService_1.planningPaperService.pauseOrAcceptLackQtyPLanning([1], "complete")).rejects.toThrow(appError_1.AppError);
    });
    test("pauseOrAcceptLackQtyPLanning - complete + có overflow → update overflow + boxTime", async () => {
        const save = jest.fn().mockResolvedValue(true);
        mockedRepo.getPapersById.mockResolvedValue([
            {
                planningId: 1,
                sortPlanning: 1,
                qtyProduced: 80,
                hasOverFlow: true,
                save,
            },
        ]);
        mockedRepo.updateDataModel.mockResolvedValue(true);
        mockedRepo.getModelById.mockResolvedValue({
            planningBoxId: 99,
        });
        const rs = await planningPaperService_1.planningPaperService.pauseOrAcceptLackQtyPLanning([1], "complete");
        expect(save).toHaveBeenCalled();
        expect(mockedRepo.updateDataModel).toHaveBeenCalled();
        expect(rs.message).toBe("Update status planning successfully");
    });
});
//# sourceMappingURL=planningPaper.test.js.map