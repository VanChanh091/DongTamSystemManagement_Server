import dotenv from "dotenv";
dotenv.config();

import { Op } from "sequelize";
import { Request } from "express";
import { AppError } from "../../utils/appError";
import { MachineBox } from "../../models/admin/machineBox";
import { meiliService } from "../meiliService";
import { CacheKey } from "../../utils/helper/cache/cacheKey";
import { PlanningBox } from "../../models/planning/planningBox";
import redisCache from "../../assets/configs/connect/redis.connect";
import { calTimeRunningPlanningBox } from "./helper/timeRunningBox";
import { CacheManager } from "../../utils/helper/cache/cacheManager";
import { runInTransaction } from "../../utils/helper/transactionHelper";
import { planningHelper } from "../../repository/planning/planningHelper";
import { meiliClient } from "../../assets/configs/connect/meilisearch.connect";
import { timeOverflowPlanning } from "../../models/planning/timeOverflowPlanning";
import { planningBoxRepository } from "../../repository/planning/planningBoxRepository";
import { PlanningBoxTime, statusBoxType } from "../../models/planning/planningBoxMachineTime";
import { meiliTransformer } from "../../assets/configs/meilisearch/meiliTransformer";
import { MEILI_INDEX } from "../../assets/labelFields";

const devEnvironment = process.env.NODE_ENV !== "production";
const { box } = CacheKey.planning;

const filterStatus = ["planning", "lackOfQty", "producing", "requested"];

export const planningBoxService = {
  //Planning Box
  getPlanningBox: async (machine: string) => {
    try {
      const cacheKey = box.machine(machine);
      const { isChanged } = await CacheManager.check(
        [
          { model: PlanningBox },
          { model: PlanningBoxTime },
          { model: timeOverflowPlanning, where: { planningBoxId: { [Op.ne]: null } } },
        ],
        "planningBox",
      );

      if (isChanged) {
        await CacheManager.clear("planningBox");
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
      const data = await planningBoxRepository.getAllPlanningBox({ machine });

      // Phân loại withSort và noSort
      const withSort = data.filter((item) =>
        item.boxTimes?.some((bt: any) => bt.sortPlanning !== null),
      );
      const noSort = data.filter(
        (item) => !item.boxTimes?.some((bt: any) => bt.sortPlanning !== null),
      );

      // Sắp xếp withSort theo sortPlanning (dùng sortPlanning đầu tiên trong boxTimes)
      withSort.sort((a, b) => {
        const sortA = a.boxTimes?.find((bt: any) => bt.sortPlanning !== null)?.sortPlanning ?? 0;
        const sortB = b.boxTimes?.find((bt: any) => bt.sortPlanning !== null)?.sortPlanning ?? 0;
        return sortA - sortB;
      });

      // Sắp xếp noSort theo flute (ưu tiên sóng)
      noSort.sort((a, b) => {
        const wavePriorityMap: Record<"C" | "B" | "E", number> = {
          C: 3,
          B: 2,
          E: 1,
        };

        const getWavePriorityList = (flute: string) => {
          if (!flute || flute.length < 2) return [];
          const waves = flute.trim().slice(1).toUpperCase().split("");
          return waves.map((w) => wavePriorityMap[w as keyof typeof wavePriorityMap] || 0);
        };

        const waveA = getWavePriorityList(a.Order?.flute ?? "");
        const waveB = getWavePriorityList(b.Order?.flute ?? "");
        const maxLength = Math.max(waveA.length, waveB.length);

        for (let i = 0; i < maxLength; i++) {
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
          // dayStart: planning.boxTimes?.[0].dayStart ?? null,
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

  getPlanningBoxByField: async (machine: string, field: string, keyword: string) => {
    try {
      const validFields = ["orderId", "customerName", "QC_box"];
      if (!validFields.includes(field)) {
        throw AppError.BadRequest(`Field '${field}' is not supported for search`, "INVALID_FIELD");
      }

      const index = meiliClient.index("planningBoxes");

      const searchResult = await index.search(keyword, {
        attributesToSearchOn: [field],
        attributesToRetrieve: ["planningBoxId"],
        filter: `boxTimes.machine = "${machine}" AND boxTimes.status IN ${JSON.stringify(filterStatus)}`,
        limit: 100,
      });

      const planningBoxIdsArr = searchResult.hits.map((hit: any) => hit.planningBoxId);
      if (!planningBoxIdsArr || planningBoxIdsArr.length === 0) {
        return { message: "No planning boxes found", data: [] };
      }

      //query db
      const fullData = await planningBoxRepository.getAllPlanningBox({
        whereCondition: { planningBoxId: { [Op.in]: planningBoxIdsArr } },
        machine,
      });

      // Sắp xếp lại thứ tự của SQL theo đúng thứ tự của Meilisearch
      const finalData = planningBoxIdsArr
        .map((id) => fullData.find((p) => p.planningBoxId === id))
        .filter(Boolean);

      return {
        message: `Search by ${field} from Meilisearch & DB`,
        data: finalData,
      };
    } catch (error) {
      console.error(`Failed to get customers by ${field}`, error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  confirmCompletePlanningBox: async (planningBoxId: number | number[], machine: string) => {
    return await planningBoxService._updateStatusBox(
      planningBoxId,
      machine,
      "complete",
      (boxTimes) => {
        // Kiểm tra sl từng đơn
        for (const box of boxTimes) {
          const { qtyProduced, runningPlan } = box;

          if ((qtyProduced ?? 0) < (runningPlan ?? 0)) {
            throw AppError.BadRequest("Lack quantity", "LACK_QUANTITY");
          }

          if (box.status !== "requested") {
            throw AppError.BadRequest(
              `Đơn ${box.PlanningBox.orderId} chưa được yêu cầu hoàn thành`,
              "PLANNING_NOT_REQUESTED",
            );
          }
        }
      },
    );
  },

  _updateStatusBox: async (
    planningBoxId: number | number[],
    machine: string,
    targetStatus: "requested" | "complete",
    extraValidator: (boxTimes: PlanningBoxTime[]) => void,
  ) => {
    return await runInTransaction(async (transaction) => {
      const ids = Array.isArray(planningBoxId) ? planningBoxId : [planningBoxId];

      const boxTimes = await planningBoxRepository.getBoxsById({
        planningBoxIds: ids,
        machine,
        options: {
          attributes: ["runningPlan", "qtyProduced", "status", "machine"],
          include: [
            {
              model: PlanningBox,
              attributes: ["planningBoxId", "hasOverFlow", "orderId"],
            },
          ],
          transaction,
        },
      });
      if (boxTimes.length !== ids.length) {
        throw AppError.BadRequest("planning not found", "PLANNING_NOT_FOUND");
      }

      // Thực thi validator riêng
      extraValidator(boxTimes);

      //cập nhật status planning
      await planningHelper.updateDataModel({
        model: PlanningBoxTime,
        data: { status: targetStatus },
        options: { where: { planningBoxId: ids, machine }, transaction },
      });

      const overflowRows = await timeOverflowPlanning.findAll({
        where: { planningBoxId: ids, machine },
        transaction,
      });

      if (overflowRows.length > 0) {
        await planningHelper.updateDataModel({
          model: timeOverflowPlanning,
          data: { status: targetStatus },
          options: { where: { planningBoxId: ids, machine }, transaction },
        });
      }

      //--------------------MEILISEARCH-----------------------
      const fullBox = await planningBoxRepository.syncPlanningBoxToMeili({
        whereCondition: { planningBoxId: { [Op.in]: ids } },
      });

      if (fullBox.length > 0) {
        const flattenData = fullBox.map(meiliTransformer.planningBox);
        await meiliService.syncOrUpdateMeiliData({
          indexKey: MEILI_INDEX.PLANNING_BOXES,
          data: flattenData,
          transaction,
        });
      }

      return { message: `Planning status updated to ${targetStatus}`, ids };
    });
  },

  acceptLackQtyBox: async (planningBoxIds: number[], newStatus: statusBoxType, machine: string) => {
    try {
      return await runInTransaction(async (transaction) => {
        const plannings = await planningBoxRepository.getBoxsById({
          planningBoxIds,
          machine,
          options: { transaction },
        });
        if (plannings.length === 0) {
          throw AppError.NotFound("planning not found", "PLANNING_NOT_FOUND");
        }

        for (const planning of plannings) {
          if (planning.sortPlanning === null) {
            throw AppError.Conflict(
              "Cannot pause planning without sortPlanning",
              "CANNOT_PAUSE_NO_SORT",
            );
          }

          planning.status = newStatus;

          await planning.save({ transaction });

          await planningHelper.updateDataModel({
            model: timeOverflowPlanning,
            data: { status: newStatus },
            options: { where: { planningBoxId: planning.planningBoxId, machine }, transaction },
          });
        }

        //--------------------MEILISEARCH-----------------------
        const fullBox = await planningBoxRepository.syncPlanningBoxToMeili({
          whereCondition: { planningBoxId: { [Op.in]: planningBoxIds } },
          transaction,
        });

        if (fullBox.length > 0) {
          const flattenData = fullBox.map(meiliTransformer.planningBox);
          await meiliService.syncOrUpdateMeiliData({
            indexKey: MEILI_INDEX.PLANNING_BOXES,
            data: flattenData,
            transaction,
          });
        }

        return { message: `Update status:${newStatus} successfully.` };
      });
    } catch (error) {
      console.error("❌ accept lack qty failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  updateIndex_TimeRunningBox: async ({
    machine,
    updateIndex,
    dayStart,
    timeStart,
    totalTimeWorking,
    isNewDay,
  }: {
    req: Request;
    machine: string;
    updateIndex: any[];
    dayStart: string | Date;
    timeStart: string;
    totalTimeWorking: number;
    isNewDay: boolean;
  }) => {
    try {
      return await runInTransaction(async (transaction) => {
        // 1. Cập nhật sortPlanning
        for (const item of updateIndex) {
          if (!item.sortPlanning) continue;

          const boxTime = await planningHelper.getModelById({
            model: PlanningBoxTime,
            where: {
              planningBoxId: item.planningBoxId,
              machine,
              status: { [Op.ne]: "complete" }, //lọc bỏ đơn đã complete
            },
            options: { transaction },
          });

          if (boxTime) {
            await planningHelper.updateDataModel({
              model: boxTime,
              data: { sortPlanning: item.sortPlanning },
              options: { transaction },
            });
          }
        }

        // 2. Lấy lại danh sách planning đã được update
        const sortedPlannings = await planningBoxRepository.getBoxesByUpdateIndex(
          updateIndex,
          machine,
          transaction,
        );

        // console.log(
        //   sortedPlannings.map((p) => ({ id: p.planningBoxId, sort: p.boxTimes?.[0]?.sortPlanning }))
        // );

        // 3. Tính toán thời gian chạy cho từng planning
        const machineInfo = await planningHelper.getModelById({
          model: MachineBox,
          where: { machineName: machine },
          options: { transaction },
        });

        if (!machineInfo) throw AppError.NotFound(`machine not found`, "MACHINE_NOT_FOUND");

        // 4. Tính toán thời gian chạy
        const updatedPlannings = await calTimeRunningPlanningBox({
          plannings: sortedPlannings,
          machineInfo: machineInfo,
          machine,
          dayStart,
          timeStart,
          totalTimeWorking,
          isNewDay,
          transaction,
        });

        return {
          message: "✅ Cập nhật sortPlanning + tính thời gian thành công",
          data: updatedPlannings,
        };
      });
    } catch (error) {
      console.error("❌ update index & time running failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },
};
