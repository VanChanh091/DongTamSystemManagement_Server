import redisCache from "../../assest/configs/redisCache";
import { CacheManager } from "../../utils/helper/cacheManager";
import { planningRepository } from "../../repository/planningRepository";
import { timeOverflowPlanning } from "../../models/planning/timeOverflowPlanning";
import { PlanningPaper } from "../../models/planning/planningPaper";
import { getPlanningByField as getPlanningByFieldHelper } from "../../utils/helper/modelHelper/planningHelper";
import { AppError } from "../../utils/appError";
import { planningPaperService } from "../../service/planning/planningPaperService";
import {
  calculateTimeRunning,
  updateSortPlanning,
} from "../../service/planning/helper/timeRunningPaper";

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
          machine: (m: string) => `planning:paper:${m}`,
          search: (m: string) => `planning:paper:search:${m}`,
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

const mockedRedis = redisCache as any;
const mockedCache = CacheManager as any;
const mockedRepo = planningRepository as any;
const mockedOverflow = timeOverflowPlanning as any;

const commit = jest.fn();
const rollback = jest.fn();

(PlanningPaper as any).sequelize = {
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

    const rs = await planningPaperService.getPlanningByMachine("M1");

    expect(rs.data[0].planningId).toBe(1);
    expect(mockedRedis.get).toHaveBeenCalled();
  });

  test("getPlanningByMachine - cache đổi → gọi getPlanningPaperSorted + lưu cache", async () => {
    mockedCache.check.mockResolvedValue({ isChanged: true });
    mockedCache.clearPlanningPaper.mockResolvedValue(true);

    const spySorted = jest
      .spyOn(planningPaperService, "getPlanningPaperSorted")
      .mockResolvedValue([{ planningId: 2 }] as any);

    mockedRedis.set.mockResolvedValue(true);

    const rs = await planningPaperService.getPlanningByMachine("M2");

    expect(spySorted).toHaveBeenCalledWith("M2");
    expect(rs.data[0].planningId).toBe(2);
    expect(mockedRedis.set).toHaveBeenCalled();
  });

  test("getPlanningByMachine - lỗi nội bộ → ServerError", async () => {
    mockedCache.check.mockResolvedValue({ isChanged: true });

    (planningPaperService.getPlanningPaperSorted as jest.Mock) = jest
      .fn()
      .mockRejectedValue(new Error("DB error"));

    await expect(planningPaperService.getPlanningByMachine("M3")).rejects.toThrow(AppError);
  });

  // =====================================================================
  // 2. getPlanningPaperSorted
  // =====================================================================
  test("getPlanningPaperSorted - sort + gộp overflow", async () => {
    const now = new Date();

    const planningWithOverflow: any = {
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

    (mockedRepo.getPlanningPaper as jest.Mock).mockResolvedValue([planningWithOverflow]);

    const rs = await planningPaperService.getPlanningPaperSorted("M1");

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
    (getPlanningByFieldHelper as jest.Mock).mockResolvedValue({
      data: [{ planningId: 10 }],
    });

    (mockedRepo.getPlanningPaper as jest.Mock).mockResolvedValue([{ planningId: 10 } as any]);

    const rs = await planningPaperService.getPlanningByField("M1", "ghepKho", "ABC");

    expect(getPlanningByFieldHelper).toHaveBeenCalled();
    expect(rs.data[0].planningId).toBe(10);
  });

  test("getPlanningByField - không có planningId → data rỗng", async () => {
    (getPlanningByFieldHelper as jest.Mock).mockResolvedValue({
      data: [],
    });

    const rs = await planningPaperService.getPlanningByField("M1", "ghepKho", "ABC");
    expect(rs.data.length).toBe(0);
  });

  test("getPlanningByField - field sai → BadRequest", async () => {
    await expect(planningPaperService.getPlanningByField("M1", "???", "kw")).rejects.toThrow(
      AppError,
    );
  });

  // =====================================================================
  // 4. changeMachinePlanning
  // =====================================================================
  test("changeMachinePlanning - không tìm thấy planning → NotFound", async () => {
    (mockedRepo.getPapersById as jest.Mock).mockResolvedValue([]);

    await expect(planningPaperService.changeMachinePlanning([1, 2], "M1" as any)).rejects.toThrow(
      AppError,
    );
  });

  test("changeMachinePlanning - đổi máy thành công", async () => {
    const save = jest.fn().mockResolvedValue(true);

    (mockedRepo.getPapersById as jest.Mock).mockResolvedValue([
      { planningId: 1, chooseMachine: "OLD", sortPlanning: 5, save },
    ]);

    const rs = await planningPaperService.changeMachinePlanning([1], "M-NEW" as any);

    expect(save).toHaveBeenCalled();
    expect(rs.plannings[0].chooseMachine).toBe("M-NEW");
    expect(rs.plannings[0].sortPlanning).toBeNull();
  });

  // =====================================================================
  // 5. confirmCompletePlanningPaper
  // =====================================================================
  test("confirmCompletePlanningPaper - không có planning stop → BadRequest", async () => {
    (mockedRepo.getStopByIds as jest.Mock).mockResolvedValue([]);

    await expect(planningPaperService.confirmCompletePlanningPaper([1])).rejects.toThrow(AppError);
  });

  test("confirmCompletePlanningPaper - thiếu qty → LACK_QUANTITY", async () => {
    (mockedRepo.getStopByIds as jest.Mock).mockResolvedValue([{}]);

    (mockedRepo.getPapersById as jest.Mock).mockResolvedValue([
      { planningId: 1, qtyProduced: 50, runningPlan: 100 },
    ]);

    await expect(planningPaperService.confirmCompletePlanningPaper([1])).rejects.toThrow(AppError);
  });

  test("confirmCompletePlanningPaper - đủ qty → cập nhật status + overflow", async () => {
    (mockedRepo.getStopByIds as jest.Mock).mockResolvedValue([{}]);

    (mockedRepo.getPapersById as jest.Mock).mockResolvedValue([
      { planningId: 1, qtyProduced: 100, runningPlan: 100 },
    ]);

    (mockedOverflow.findAll as jest.Mock).mockResolvedValue([{ id: 1 }]);
    (mockedRepo.updateDataModel as jest.Mock).mockResolvedValue(true);

    const rs = await planningPaperService.confirmCompletePlanningPaper([1]);

    expect(rs.message).toBe("planning paper updated successfully");
    expect(mockedRepo.updateDataModel).toHaveBeenCalled();
  });

  // =====================================================================
  // 6. pauseOrAcceptLackQtyPLanning
  // =====================================================================
  test("pauseOrAcceptLackQtyPLanning - không tìm thấy planning → NotFound", async () => {
    (mockedRepo.getPapersById as jest.Mock).mockResolvedValue([]);

    await expect(planningPaperService.pauseOrAcceptLackQtyPLanning([1], "reject")).rejects.toThrow(
      AppError,
    );
  });

  test("pauseOrAcceptLackQtyPLanning - reject nhưng đã sản xuất → Conflict", async () => {
    (mockedRepo.getPapersById as jest.Mock).mockResolvedValue([
      { planningId: 1, orderId: "ORD1", qtyProduced: 10 },
    ]);

    (mockedRepo.getModelById as jest.Mock).mockResolvedValue({ orderId: "ORD1" });

    await expect(planningPaperService.pauseOrAcceptLackQtyPLanning([1], "reject")).rejects.toThrow(
      AppError,
    );
  });

  test("pauseOrAcceptLackQtyPLanning - reject qty = 0 → xoá planning + box", async () => {
    const planningDestroy = jest.fn().mockResolvedValue(true);
    const boxDestroy = jest.fn().mockResolvedValue(true);

    (mockedRepo.getPapersById as jest.Mock).mockResolvedValue([
      { planningId: 1, orderId: "ORD1", qtyProduced: 0, destroy: planningDestroy },
    ]);

    (mockedRepo.getModelById as jest.Mock).mockResolvedValue({ orderId: "ORD1" });

    (mockedRepo.getBoxByPlanningId as jest.Mock).mockResolvedValue([
      { planningBoxId: 10, destroy: boxDestroy },
    ]);

    (mockedRepo.deleteModelData as jest.Mock).mockResolvedValue(true);
    (mockedRepo.updateDataModel as jest.Mock).mockResolvedValue(true);

    const rs = await planningPaperService.pauseOrAcceptLackQtyPLanning([1], "reject", "reason");

    expect(rs.message).toBe("Update status planning successfully");
    expect(planningDestroy).toHaveBeenCalled();
    expect(boxDestroy).toHaveBeenCalled();
  });

  test("pauseOrAcceptLackQtyPLanning - complete + sortPlanning null → BadRequest", async () => {
    (mockedRepo.getPapersById as jest.Mock).mockResolvedValue([
      {
        planningId: 1,
        sortPlanning: null,
        qtyProduced: 100,
        hasOverFlow: false,
        save: jest.fn(),
      },
    ]);

    await expect(
      planningPaperService.pauseOrAcceptLackQtyPLanning([1], "complete"),
    ).rejects.toThrow(AppError);
  });

  test("pauseOrAcceptLackQtyPLanning - complete + có overflow → update overflow + boxTime", async () => {
    const save = jest.fn().mockResolvedValue(true);

    (mockedRepo.getPapersById as jest.Mock).mockResolvedValue([
      {
        planningId: 1,
        sortPlanning: 1,
        qtyProduced: 80,
        hasOverFlow: true,
        save,
      },
    ]);

    (mockedRepo.updateDataModel as jest.Mock).mockResolvedValue(true);

    (mockedRepo.getModelById as jest.Mock).mockResolvedValue({
      planningBoxId: 99,
    });

    const rs = await planningPaperService.pauseOrAcceptLackQtyPLanning([1], "complete");

    expect(save).toHaveBeenCalled();
    expect(mockedRepo.updateDataModel).toHaveBeenCalled();
    expect(rs.message).toBe("Update status planning successfully");
  });
});
