import dotenv from "dotenv";
dotenv.config();
import { CacheManager } from "../../utils/helper/cacheManager";
import { planningRepository } from "../../repository/planningRepository";
import redisCache from "../../configs/redisCache";
import { AppError } from "../../utils/appError";
import { PlanningBox } from "../../models/planning/planningBox";
import { PlanningBoxTime, statusBoxType } from "../../models/planning/planningBoxMachineTime";
import { timeOverflowPlanning } from "../../models/planning/timeOverflowPlanning";
import { Op } from "sequelize";
import { MachineBox } from "../../models/admin/machineBox";
import { Request } from "express";
import { calTimeRunningPlanningBox } from "./helper/timeRunningBox";

const devEnvironment = process.env.NODE_ENV !== "production";
const { box } = CacheManager.keys.planning;

export const planningBoxService = {
  //Planning Box
  getPlanningBox: async (machine: string) => {
    try {
      if (!machine) {
        throw AppError.BadRequest("Missing machine parameter", "MISSING_PARAMETERS");
      }

      const cacheKey = box.machine(machine);
      const { isChanged } = await CacheManager.check(
        [
          { model: PlanningBox },
          { model: PlanningBoxTime },
          { model: timeOverflowPlanning, where: { planningBoxId: { [Op.ne]: null } } },
        ],
        "planningBox"
      );

      if (isChanged) {
        await CacheManager.clearPlanningBox();
      } else {
        const cachedData = await redisCache.get(cacheKey);
        if (cachedData) {
          if (devEnvironment) console.log("✅ Data PlanningBox from Redis");
          return {
            message: `get filtered cached planning:box:machine:${machine}`,
            data: JSON.parse(cachedData),
          };
        }
      }

      const planning = await planningBoxService.getPlanningBoxSorted(machine);

      await redisCache.set(cacheKey, JSON.stringify(planning), "EX", 1800);

      return { message: `get planning by machine: ${machine}`, data: planning };
    } catch (error) {
      console.error("❌ get planning box failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  //sort planning
  getPlanningBoxSorted: async (machine: string) => {
    try {
      const data = await planningRepository.getAllPlanningBox(machine);

      //lọc đơn complete trong 3 ngày
      const truncateToDate = (date: Date) =>
        new Date(date.getFullYear(), date.getMonth(), date.getDate());

      const now = truncateToDate(new Date());

      const validData = data.filter((planning) => {
        const boxTimes = (planning as any).boxTimes || [];

        const hasValidStatus = boxTimes.some((bt: any) =>
          ["planning", "lackOfQty", "producing"].includes(bt.status)
        );

        const hasRecentComplete = boxTimes.some((bt: any) => {
          if (bt.status !== "complete" || !bt.dayCompleted) return false;

          const dayCompleted = new Date(bt.dayCompleted);
          if (isNaN(dayCompleted.getTime())) return false;

          const expiredDate = truncateToDate(dayCompleted);
          expiredDate.setDate(expiredDate.getDate() + 3);

          return expiredDate >= now;
        });

        return hasValidStatus || hasRecentComplete;
      });

      // 3. Phân loại withSort và noSort
      const withSort = validData.filter((item) =>
        item.boxTimes?.some((bt: any) => bt.sortPlanning !== null)
      );
      const noSort = validData.filter(
        (item) => !item.boxTimes?.some((bt: any) => bt.sortPlanning !== null)
      );

      // Sắp xếp withSort theo sortPlanning (dùng sortPlanning đầu tiên trong boxTimes)
      withSort.sort((a, b) => {
        const sortA = a.boxTimes?.find((bt: any) => bt.sortPlanning !== null)?.sortPlanning ?? 0;
        const sortB = b.boxTimes?.find((bt: any) => bt.sortPlanning !== null)?.sortPlanning ?? 0;
        return sortA - sortB;
      });

      // Sắp xếp noSort theo flute (ưu tiên sóng)
      noSort.sort((a, b) => {
        const wavePriorityMap = { C: 3, B: 2, E: 1 };

        const getWavePriorityList = (flute: any) => {
          if (!flute) return [];
          return flute
            .toUpperCase()
            .replace(/[^A-Z]/g, "")
            .split("")
            .map((w: any) => wavePriorityMap[w as keyof typeof wavePriorityMap] ?? 0);
        };

        const waveA = getWavePriorityList(a.Order?.flute);
        const waveB = getWavePriorityList(b.Order?.flute);

        for (let i = 0; i < Math.max(waveA.length, waveB.length); i++) {
          const priA = waveA[i] ?? 0;
          const priB = waveB[i] ?? 0;
          if (priB !== priA) return priB - priA;
        }

        return 0;
      });

      const sortedPlannings = [...withSort, ...noSort];

      // 4. Gộp đơn overflow nếu có
      const allPlannings: any[] = [];
      sortedPlannings.forEach((planning) => {
        const original = {
          ...planning.toJSON(),
          dayStart: planning.boxTimes?.[0].dayStart ?? null,
        };
        allPlannings.push(original);

        if (planning.timeOverFlow && planning.timeOverFlow.length > 0) {
          planning.timeOverFlow.forEach((of: any) => {
            const overflowPlanning = {
              ...original,
              boxTimes: (planning.boxTimes || []).map((bt: any) => ({
                ...bt.toJSON(),
                dayStart: of.overflowDayStart,
                dayCompleted: of.overflowDayCompleted,
                timeRunning: of.overflowTimeRunning,
              })),
            };
            allPlannings.push(overflowPlanning);
          });
        }
      });

      return allPlannings;
    } catch (error: any) {
      console.error("Error fetching planning by machine:", error.message);
      throw error;
    }
  },

  getPlanningBoxByOrderId: async (machine: string, orderId: string) => {
    try {
      if (!machine || !orderId) {
        throw AppError.BadRequest("Missing machine or orderId parameter", "MISSING_PARAMETERS");
      }

      const cacheKey = box.machine(machine);
      const cachedData = await redisCache.get(cacheKey);
      if (cachedData) {
        if (devEnvironment) console.log("✅ Data planning from Redis");
        const parsedData = JSON.parse(cachedData);

        // Tìm kiếm tương đối trong cache
        const filteredData = parsedData.filter((item: any) => {
          return item.orderId?.toLowerCase().includes(orderId.toLowerCase());
        });

        return { message: "Get planning by orderId from cache", data: filteredData };
      }

      const planning = await planningRepository.getBoxsByOrderId(orderId);

      if (!planning || planning.length === 0) {
        throw AppError.NotFound(`Không tìm thấy kế hoạch chứa: ${orderId}`, "PLANNING_NOT_FOUND");
      }

      return { message: "Get planning by orderId from db", data: planning };
    } catch (error) {
      console.error("❌ get planning box by id failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  acceptLackQtyBox: async (planningBoxIds: number[], newStatus: statusBoxType, machine: string) => {
    try {
      if (!Array.isArray(planningBoxIds) || planningBoxIds.length === 0) {
        throw AppError.BadRequest("Missing planningBoxIds parameter", "MISSING_PARAMETERS");
      }
      const plannings = await planningRepository.getBoxsById(planningBoxIds, machine);
      if (plannings.length === 0) {
        throw AppError.NotFound("planning not found", "PLANNING_NOT_FOUND");
      }

      for (const planning of plannings) {
        if (planning.sortPlanning === null) {
          throw AppError.Conflict(
            "Cannot pause planning without sortPlanning",
            "CANNOT_PAUSE_NO_SORT"
          );
        }

        planning.status = newStatus;

        await planning.save();

        await planningRepository.updateDataModel(
          timeOverflowPlanning,
          { status: newStatus },
          { where: { planningBoxId: planning.planningBoxId } }
        );
      }

      return { message: `Update status:${newStatus} successfully.` };
    } catch (error) {
      console.error("❌ accept lack qty failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  updateIndex_TimeRunningBox: async ({
    req,
    machine,
    updateIndex,
    dayStart,
    timeStart,
    totalTimeWorking,
  }: {
    req: Request;
    machine: string;
    updateIndex: any[];
    dayStart: string | Date;
    timeStart: string;
    totalTimeWorking: number;
  }) => {
    const transaction = await PlanningBox.sequelize?.transaction();

    try {
      if (!Array.isArray(updateIndex) || updateIndex.length === 0) {
        throw AppError.BadRequest("Missing updateIndex parameter", "MISSING_PARAMETERS");
      }

      // 1. Cập nhật sortPlanning
      for (const item of updateIndex) {
        if (!item.sortPlanning) continue;

        const boxTime = await planningRepository.getModelById(
          PlanningBoxTime,
          {
            planningBoxId: item.planningBoxId,
            machine,
            status: { [Op.ne]: "complete" }, //không cập nhật đơn đã complete
          },
          { transaction }
        );

        if (boxTime) {
          planningRepository.updateDataModel(
            boxTime,
            { sortPlanning: item.sortPlanning },
            { transaction }
          );
        }
      }

      // 2. Lấy lại danh sách planning đã được update
      const sortedPlannings = await planningRepository.getBoxesByUpdateIndex(
        updateIndex,
        machine,
        transaction
      );

      // 3. Tính toán thời gian chạy cho từng planning
      const machineInfo = await planningRepository.getModelById(MachineBox, {
        machineName: machine,
      });

      if (!machineInfo) throw AppError.NotFound(`machine not found`, "MACHINE_NOT_FOUND");

      const updatedPlannings = await calTimeRunningPlanningBox({
        plannings: sortedPlannings,
        machineInfo: machineInfo,
        machine,
        dayStart,
        timeStart,
        totalTimeWorking,
        transaction,
      });

      await transaction?.commit();

      //socket
      const roomName = `machine_${machine.toLowerCase().replace(/\s+/g, "_")}`;
      req.io?.to(roomName).emit("planningBoxUpdated", {
        machine,
        message: `Kế hoạch của ${machine} đã được cập nhật.`,
      });

      return {
        message: "✅ Cập nhật sortPlanning + tính thời gian thành công",
        data: updatedPlannings,
      };
    } catch (error) {
      console.error("❌ update index & time running failed:", error);
      await transaction?.rollback();
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },
};
