import dotenv from "dotenv";
dotenv.config();

import { AppError } from "../utils/appError";
import { deliveryRepository } from "../repository/deliveryRepository";
import { runInTransaction } from "../utils/helper/transactionHelper";
import { PlanningPaper } from "../models/planning/planningPaper";
import { DeliveryItem } from "../models/delivery/deliveryItem";
import { DeliveryPlan } from "../models/delivery/deliveryPlan";
import { Op } from "sequelize";
import { exportDeliveryExcelResponse } from "../utils/helper/excelExporter";
import { Response } from "express";
import { deliveryColumns, mappingDeliveryRow } from "../utils/mapping/deliveryRowAndComlumn";
import { getDeliveryByDate } from "../utils/helper/modelHelper/deliveryHelper";

const devEnvironment = process.env.NODE_ENV !== "production";

export const deliveryService = {
  //================================PLANNING ESTIMATE TIME==================================
  getPlanningEstimateTime: async ({
    page = 1,
    pageSize = 20,
    dayStart,
    estimateTime,
  }: {
    page?: number;
    pageSize?: number;
    dayStart: Date;
    estimateTime: string;
  }) => {
    try {
      const [endHour, endMinute] = estimateTime.split(":").map(Number);

      if (
        isNaN(endHour) ||
        isNaN(endMinute) ||
        endHour < 0 ||
        endHour > 23 ||
        endMinute < 0 ||
        endMinute > 59
      ) {
        throw AppError.BadRequest("estimateTime không hợp lệ", "INVALID_ESTIMATE_TIME");
      }

      // mốc kết thúc NGÀY HÔM NAY
      const [estH, estM] = estimateTime.split(":").map(Number);
      const estimateMinutes = estH * 60 + estM;

      const paperPlannings = await deliveryRepository.getPlanningEstimateTime(dayStart);

      //filter
      const filtered = paperPlannings.filter((paper) => {
        if (paper.hasOverFlow) return false;

        if (paper.status === "complete") return true;

        // KHÔNG CÓ BOX → so paper
        if (!paper.hasBox) {
          if (!paper.timeRunning) return false;

          const [h, m, s = "0"] = paper.timeRunning.split(":");
          const paperMinutes = Number(h) * 60 + Number(m) + Number(s) / 60;

          // console.log(`time paper: ${paperMinutes}`);
          // console.log(`compare paper: ${paperMinutes <= estimateMinutes}`);

          return paperMinutes <= estimateMinutes;
        }

        // CÓ BOX → so theo BOX
        const boxTimes = paper.PlanningBox?.boxTimes ?? [];

        if (boxTimes.length === 0) return false;

        const latestBoxMinutes = Math.max(
          ...boxTimes.map((t: any) => {
            const [h, m, s = "0"] = t.timeRunning.split(":");

            return Number(h) * 60 + Number(m) + Number(s) / 60;
          }),
        );

        // console.log(`latest time box: ${latestBoxMinutes}`);
        // console.log(`compare box: ${latestBoxMinutes <= estimateMinutes}`);

        return latestBoxMinutes <= estimateMinutes;
      });

      //PAGING DATA
      const totalPlannings = filtered.length;
      const totalPages = Math.ceil(totalPlannings / pageSize);

      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;

      const pageData = filtered.slice(startIndex, endIndex);

      //remove Planning box for UI
      const data = pageData.map((p: any) => {
        const plain = p.get({ plain: true });
        delete plain.PlanningBox;
        return plain;
      });

      const responseData = {
        message: "get all data paper from db",
        data,
        totalPlannings,
        totalPages,
        currentPage: page,
      };

      return responseData;
    } catch (error) {
      console.error("❌ get planning estimate time failed:", error);
      throw AppError.ServerError();
    }
  },

  confirmReadyDeliveryPlanning: async ({ planningIds }: { planningIds: number[] }) => {
    try {
      if (!planningIds || planningIds.length === 0) {
        throw AppError.BadRequest("Danh sách planning rỗng", "EMPTY_PLANNING_LIST");
      }

      return await runInTransaction(async (transaction) => {
        const plannings = await deliveryRepository.getPaperDeliveryPlanned(
          planningIds,
          transaction,
        );

        if (plannings.length !== planningIds.length) {
          throw AppError.BadRequest(
            "Một số planning không tồn tại hoặc đã được xác nhận",
            "INVALID_PLANNING_IDS",
          );
        }

        for (const planning of plannings) {
          if (planning.hasOverFlow) {
            throw AppError.BadRequest(
              `Planning ${planning.planningId} bị overflow`,
              "PLANNING_OVERFLOW",
            );
          }

          await planning.update({ deliveryPlanned: "pending" }, { transaction });
        }

        return { message: "confirm ready delivery planning successfully" };
      });
    } catch (error) {
      console.error("❌ confirm ready delivery planning failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  //=================================PLANNING DELIVERY=====================================

  getPlanningPendingDelivery: async () => {
    try {
      const planningWaiting = await deliveryRepository.getPlanningPendingDelivery();

      //remove Planning box and calculate volume
      const data = await Promise.all(
        planningWaiting.map(async (p: any) => {
          const plain = p.get({ plain: true });

          //calculate volume
          const ratioData = await deliveryRepository.findOneFluteRatio(plain.Order?.flute);

          const lengthPaper = plain.lengthPaperPlanning ?? 0;
          const paperSize = plain.sizePaperPLaning ?? 0;
          const ratio = ratioData?.ratio ?? 1;

          const rawVolume = lengthPaper * paperSize * ratio;
          plain.volume = Math.round(rawVolume * 100) / 100;

          // delete plain.PlanningBox;
          return plain;
        }),
      );

      return { message: "get planning waiting delivery successfully", data };
    } catch (error) {
      console.error("❌ get planning waiting delivery failed:", error);
      throw AppError.ServerError();
    }
  },

  //using for re-order  when hasn't confirm delivery
  getDeliveryPlanDetailForEdit: async (deliveryDate: Date) => {
    try {
      const plan = await deliveryRepository.getDeliveryPlanByDate(deliveryDate);

      if (!plan) {
        return {
          message: "delivery for date has no plan",
          data: [],
        };
      }

      // const results: any[] = [];
      const items = plan.DeliveryItems ?? [];

      //step 1: get all planning detail
      const paperIds = items.filter((i) => i.targetType === "paper").map((i) => i.targetId);
      const boxIds = items.filter((i) => i.targetType === "box").map((i) => i.targetId);

      const boxes = boxIds.length > 0 ? await deliveryRepository.getAllBoxByIds(boxIds, true) : [];

      //map planningBoxId to planningId
      const boxIdToPlanningIdMap: Record<number, number> = Object.fromEntries(
        boxes.map((b) => [b.planningBoxId, b.planningId]),
      );

      const allPlanningIds = [...paperIds, ...boxes.map((b) => b.planningId).filter((id) => id)];

      //step 2: get all planning paper detail
      const [paperData, fluteRatio] = await Promise.all([
        allPlanningIds.length > 0
          ? deliveryRepository.getAllPaperByIds(allPlanningIds)
          : Promise.resolve([]),

        deliveryRepository.findAllFluteRatio(),
      ]);

      //create map for quick access
      const paperMap = Object.fromEntries(paperData.map((p) => [p.planningId, p]));
      const ratioMap = Object.fromEntries(fluteRatio.map((r) => [r.fluteName, r.ratio])); //2E -> 0.0017

      //step 3: merge data and calculate volume
      const results = items.map((item) => {
        const itemPlain = item.get({ plain: true });

        const targetId =
          item.targetType === "paper" ? item.targetId : boxIdToPlanningIdMap[item.targetId];

        let paperInfo = paperMap[targetId] ? { ...paperMap[targetId] } : null;

        //calculate volume
        let volume = 0;
        if (paperInfo) {
          const fluteName = paperInfo.Order?.flute;
          const ratio = fluteName && ratioMap[fluteName] ? ratioMap[fluteName] : 1;
          const lengthPaper = paperInfo.lengthPaperPlanning ?? 0;
          const paperSize = paperInfo.sizePaperPLaning ?? 0;

          const rawVolume = lengthPaper * paperSize * ratio;
          volume = Math.round(rawVolume * 100) / 100;
        }

        return { ...itemPlain, Planning: { ...paperInfo, volume } };
      });

      return {
        message: "get delivery plan detail for edit successfully",
        data: [
          {
            deliveryId: plan.deliveryId,
            deliveryDate: plan.deliveryDate,
            status: plan.status,
            DeliveryItems: results,
          },
        ],
      };
    } catch (error) {
      console.error("❌ get planning detail for edit:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  createDeliveryPlan: async ({
    deliveryDate,
    items,
  }: {
    deliveryDate: Date;
    items: {
      targetType: "paper" | "box";
      targetId: number;
      vehicleId: number;
      sequence: number;
      note?: string;
    }[];
  }) => {
    try {
      if (!deliveryDate || !items) {
        throw AppError.BadRequest("Missing delivery data", "INVALID_PAYLOAD");
      }

      return await runInTransaction(async (transaction) => {
        // 1. get or create delivery plan
        const [plan] = await deliveryRepository.findOrCreateDeliveryPlan(deliveryDate, transaction);

        const existingItems = plan.DeliveryItems ?? [];

        //group boxIds
        const incomingBoxIds = items.filter((i) => i.targetType === "box").map((i) => i.targetId);
        const existingBoxIds = existingItems
          .filter((i) => i.targetType === "box")
          .map((i) => i.targetId);
        const allBoxIds = [...new Set([...incomingBoxIds, ...existingBoxIds])];

        //map boxId to planningId
        const boxToPaperMap = new Map<number, number>();
        if (allBoxIds.length > 0) {
          const boxes = await deliveryRepository.getAllBoxByIds(allBoxIds, false);
          boxes.forEach((b) => boxToPaperMap.set(b.planningBoxId, b.planningId));
        }

        const existingMap = new Map(existingItems.map((i) => [`${i.targetType}-${i.targetId}`, i]));
        const incomingKeys = new Set(items.map((i) => `${i.targetType}-${i.targetId}`));

        const paperIdsToPlanned = new Set<number>();
        const paperIdsToReset = new Set<number>();

        // Tạo mảng để Bulk Sync (Vừa Create vừa Update)
        const allItemsToSync = items.map((item) => {
          const key = `${item.targetType}-${item.targetId}`;
          const existingItem = existingMap.get(key);

          // Thu thập PlanningId để cập nhật trạng thái "Planned"
          const pId =
            item.targetType === "paper" ? item.targetId : boxToPaperMap.get(item.targetId);
          if (pId) paperIdsToPlanned.add(pId);

          return {
            //if has old ID then pass to DB for UPDATE, else INSERT
            ...(existingItem ? { deliveryItemId: existingItem.deliveryItemId } : {}),
            deliveryId: plan.deliveryId,
            targetType: item.targetType,
            targetId: item.targetId,
            vehicleId: item.vehicleId,
            sequence: item.sequence,
            note: item.note ?? "",
            status: existingItem ? existingItem.status : "none",
          };
        });

        const itemsToDelete = existingItems.filter(
          (i) => !incomingKeys.has(`${i.targetType}-${i.targetId}`),
        );

        //delete item out of list
        if (itemsToDelete.length > 0) {
          itemsToDelete.forEach((delItem) => {
            const pId =
              delItem.targetType === "paper"
                ? delItem.targetId
                : boxToPaperMap.get(delItem.targetId);
            if (pId) paperIdsToReset.add(pId);
          });

          await deliveryRepository.destroyItemById(
            itemsToDelete.map((i) => i.deliveryItemId),
            transaction,
          );
        }

        //create or update items
        if (allItemsToSync.length > 0) {
          await deliveryRepository.bulkUpsert(allItemsToSync, transaction);
        }

        if (paperIdsToPlanned.size > 0) {
          await deliveryRepository.updatePlanningPaperById({
            planningIds: [...paperIdsToPlanned],
            status: "planned",
            transaction,
          });
        }

        //reset pending for removed items
        const finalResetIds = [...paperIdsToReset].filter((id) => !paperIdsToPlanned.has(id));
        if (finalResetIds.length > 0) {
          await deliveryRepository.updatePlanningPaperById({
            planningIds: finalResetIds,
            status: "pending",
            transaction,
          });
        }

        return { message: "Sync delivery plan success" };
      });
    } catch (error) {
      console.error("❌ Sync delivery plan failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  confirmForDeliveryPlanning: async (deliveryDate: Date) => {
    try {
      return await runInTransaction(async (transaction) => {
        let existedPlan = await deliveryRepository.findOneDeliveryPlanByDate(
          deliveryDate,
          transaction,
        );

        if (!existedPlan) {
          throw AppError.NotFound("Không tìm thấy kế hoạch để xác nhận", "DELIVERY_PLAN_NOT_FOUND");
        }

        //update status delivery plan
        await existedPlan.update({ status: "planned" }, { transaction });

        //update status delivery item
        await deliveryRepository.updateDeliveryItemById({
          statusUpdate: "planned",
          whereCondition: { deliveryId: existedPlan.deliveryId },
          transaction,
        });

        return { message: "Chốt kế hoạch giao hàng thành công" };
      });
    } catch (error) {
      console.error("❌ confirm delivery planning failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  //=================================SCHEDULE DELIVERY=====================================
  getAllScheduleDelivery: async (deliveryDate: Date) => {
    try {
      const finalData = await getDeliveryByDate(deliveryDate);

      return { message: "get schedule delivery successfully", data: finalData };
    } catch (error) {
      console.error("❌ get schedule delivery failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  cancelOrCompleteDeliveryPlan: async ({
    deliveryId,
    itemIds,
    action,
  }: {
    deliveryId: number;
    itemIds: number[];
    action: "complete" | "cancel";
  }) => {
    try {
      return runInTransaction(async (transaction) => {
        if (action === "complete") {
          await deliveryRepository.updateDeliveryItemById({
            statusUpdate: "completed",
            whereCondition: { deliveryItemId: { [Op.in]: itemIds }, deliveryId },
            transaction,
          });
        } else if (action === "cancel") {
          const itemsCancel = await deliveryRepository.getDeliveryItemByIds(itemIds, transaction);

          if (itemsCancel.length > 0) {
            const paperIds = itemsCancel
              .filter((i) => i.targetType === "paper")
              .map((i) => i.targetId);
            const boxIds = itemsCancel.filter((i) => i.targetType === "box").map((i) => i.targetId);

            const boxes =
              boxIds.length > 0 ? await deliveryRepository.getAllBoxByIds(boxIds, true) : [];

            const allPlanningIds = [
              ...paperIds,
              ...boxes.map((b) => b.planningId).filter((id) => id),
            ];

            //update planning paper deliveryPlanned to pending
            await PlanningPaper.update(
              { deliveryPlanned: "pending" },
              { where: { planningId: allPlanningIds }, transaction },
            );

            //update delivery item status
            await DeliveryItem.update(
              { status: "cancelled" },
              { where: { deliveryItemId: itemIds, deliveryId }, transaction },
            );
          }
        }
        //check order not in complete or cancel
        const remainingPlannedItems = await deliveryRepository.deliveryCount(
          deliveryId,
          transaction,
        );

        //update delivery plan status if all items are completed or cancelled
        if (remainingPlannedItems === 0) {
          await DeliveryPlan.update(
            { status: "completed" },
            { where: { deliveryId }, transaction },
          );
        }

        return {
          message: `${action == "complete" ? "Hoàn thành" : "Hủy"} kế hoạch giao hàng thành công`,
        };
      });
    } catch (error) {
      console.error("❌ get schedule delivery failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  exportScheduleDelivery: async (res: Response, deliveryDate: Date) => {
    try {
      const data = await getDeliveryByDate(deliveryDate);

      const dataArray = Array.isArray(data) ? data : data.data;

      await exportDeliveryExcelResponse(res, {
        data: dataArray,
        sheetName: "Lịch Giao Hàng",
        fileName: "delivery_schedule",
        columns: deliveryColumns,
        rows: mappingDeliveryRow,
      });
    } catch (error) {
      console.error("❌ Export Excel error:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },
};
