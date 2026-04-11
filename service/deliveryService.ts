import dotenv from "dotenv";
dotenv.config();

import { Op } from "sequelize";
import { Request, Response } from "express";
import { AppError } from "../utils/appError";
import { DeliveryPlan } from "../models/delivery/deliveryPlan";
import { DeliveryItem } from "../models/delivery/deliveryItem";
import { PlanningPaper } from "../models/planning/planningPaper";
import { DeliveryRequest } from "../models/delivery/deliveryRequest";
import { runInTransaction } from "../utils/helper/transactionHelper";
import { deliveryRepository } from "../repository/deliveryRepository";
import { calculateVolume } from "../utils/helper/modelHelper/orderHelpers";
import { exportDeliveryExcelResponse } from "../utils/helper/excelExporter";
import { deliveryColumns, mappingDeliveryRow } from "../utils/mapping/deliveryRowAndComlumn";
import { CacheKey } from "../utils/helper/cache/cacheKey";
import { CacheManager } from "../utils/helper/cache/cacheManager";
import redisCache from "../assets/configs/connect/redis.connect";

const devEnvironment = process.env.NODE_ENV !== "production";
const { estimate, schedule } = CacheKey.delivery;

export const deliveryService = {
  //================================PLANNING ESTIMATE TIME==================================
  getPlanningEstimateTime: async ({
    page = 1,
    pageSize = 20,
    dayStart,
    estimateTime,
    userId,
    all = "false",
  }: {
    page?: number;
    pageSize?: number;
    dayStart: Date;
    estimateTime: string;
    userId: number;
    all: string;
  }) => {
    // const cacheKey = estimate.page(page);

    try {
      // const { isChanged } = await CacheManager.check(PlanningPaper, "estimate");

      // if (isChanged) {
      //   await CacheManager.clear("estimate");
      // } else {
      //   const cachedData = await redisCache.get(cacheKey);
      //   if (cachedData) {
      //     if (devEnvironment) console.log("✅ get planning estimate time from cache");
      //     return { ...JSON.parse(cachedData), message: "get all planning estimate from cache" };
      //   }
      // }

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

      const paperPlannings = await deliveryRepository.getPlanningEstimateTime(
        dayStart,
        userId,
        all,
      );

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

      // await redisCache.set(cacheKey, JSON.stringify(responseData), "EX", 3600);

      return responseData;
    } catch (error) {
      console.error("❌ get planning estimate time failed:", error);
      throw AppError.ServerError();
    }
  },

  registerQtyDelivery: async ({
    planningId,
    qtyRegistered,
    userId,
  }: {
    planningId: number;
    qtyRegistered: number;
    userId: number;
  }) => {
    try {
      if (!planningId || !qtyRegistered || qtyRegistered <= 0) {
        throw AppError.BadRequest("missing parameters", "MISSING_PARAMETERS");
      }

      return await runInTransaction(async (transaction) => {
        const planning = await deliveryRepository.getPaperDeliveryPlanned(planningId, transaction);
        if (!planning) {
          throw AppError.BadRequest("Planning không tồn tại", "PLANNING_NOT_FOUND");
        }

        if (planning.hasOverFlow) {
          throw AppError.BadRequest(`Planning ${planningId} bị overflow`, "PLANNING_OVERFLOW");
        }

        if (qtyRegistered > planning.qtyProduced!) {
          throw AppError.BadRequest(
            `Số lượng đăng ký (${qtyRegistered}) vượt quá số lượng đã sản xuất (${planning.qtyProduced ?? 0})`,
            "QTY_EXCEEDED",
          );
        }

        const newDeliveryStatus = qtyRegistered === planning.qtyProduced ? "delivered" : "pending";

        //calculate volume
        const volume = await calculateVolume({
          flute: planning.Order.flute!,
          lengthCustomer: planning.Order.lengthPaperCustomer,
          sizeCustomer: planning.Order.paperSizeCustomer,
          quantity: qtyRegistered,
        });

        await DeliveryRequest.create(
          {
            planningId,
            userId,
            qtyRegistered,
            volume,
            status: "requested",
          },
          { transaction },
        );

        // Cập nhật trạng thái PlanningPaper
        await PlanningPaper.update(
          { deliveryPlanned: newDeliveryStatus },
          { where: { planningId }, transaction },
        );

        return {
          message: "Xác nhận đăng ký giao hàng thành công",
          data: { statusPlanning: newDeliveryStatus, volume },
        };
      });
    } catch (error) {
      console.error("❌ confirm ready delivery planning failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  //=================================PLANNING DELIVERY=====================================

  getDeliveryRequest: async () => {
    try {
      const request = await deliveryRepository.getDeliveryRequest();

      return { message: "get planning waiting delivery successfully", data: request };
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
        return { message: "delivery for date hasn't plan", data: [] };
      }

      return {
        message: "get delivery plan detail for edit successfully",
        data: plan,
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
      requestId: number;
      vehicleId: number;
      sequence: string;
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
        const incomingRequestIds = items.map((i) => i.requestId);

        // 2. Xác định các Request bị loại khỏi kế hoạch
        const itemsToDelete = existingItems.filter(
          (i) => !incomingRequestIds.includes(i.requestId),
        );
        const requestIdsToReset = itemsToDelete.map((i) => i.requestId);

        // 3. Chuẩn bị dữ liệu để đồng bộ
        const existingMap = new Map(existingItems.map((i) => [i.requestId, i]));

        const allItemsToSync = items.map((item) => {
          const existingItem = existingMap.get(item.requestId);

          return {
            ...(existingItem ? { deliveryItemId: existingItem.deliveryItemId } : {}),
            deliveryId: plan.deliveryId,
            requestId: item.requestId,
            vehicleId: item.vehicleId,
            sequence: item.sequence,
            note: item.note ?? "",
            status: "none",
          };
        });

        // ----------- THỰC THI DATABASE --------------

        // Xóa những item không còn nằm trong danh sách xếp chuyến
        if (itemsToDelete.length > 0) {
          await deliveryRepository.destroyItemById(
            itemsToDelete.map((i) => i.deliveryItemId),
            transaction,
          );

          // Trả trạng thái DeliveryRequest về 'requested' để có thể xếp chuyến khác
          await deliveryRepository.updateDeliveryRequestStatus(
            requestIdsToReset,
            "requested",
            transaction,
          );
        }

        // Cập nhật hoặc thêm mới các Item vào chuyến xe
        if (allItemsToSync.length > 0) {
          await deliveryRepository.bulkUpsert(allItemsToSync, transaction);

          // Cập nhật trạng thái các DeliveryRequest
          await deliveryRepository.updateDeliveryRequestStatus(
            incomingRequestIds,
            "scheduled",
            transaction,
          );
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
        const existedPlan = await deliveryRepository.findOneDeliveryPlanByDate(
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
    const cacheKey = schedule.date(deliveryDate);

    try {
      const { isChanged } = await CacheManager.check(DeliveryItem, "schedule");

      if (isChanged) {
        await CacheManager.clear("schedule");
      } else {
        const cachedData = await redisCache.get(cacheKey);
        if (cachedData) {
          if (devEnvironment) console.log("✅ get schedule delivery from cache");
          return { message: "get all schedule delivery from cache", data: JSON.parse(cachedData) };
        }
      }

      const finalData = await deliveryRepository.getAllDeliveryPlanByDate({
        deliveryDate,
        status: "planned",
      });

      //save
      await redisCache.set(cacheKey, JSON.stringify(finalData), "EX", 3600);

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
        const items = await DeliveryItem.findAll({
          where: { deliveryItemId: { [Op.in]: itemIds }, deliveryId },
          include: [
            {
              model: DeliveryRequest,
              attributes: ["requestId", "planningId"],
            },
          ],
          transaction,
        });

        if (items.length === 0) {
          throw AppError.BadRequest("Không tìm thấy item nào để cập nhật", "ITEMS_NOT_FOUND");
        }

        const requestIds = items.map((i) => i.requestId);

        if (action === "complete") {
          await deliveryRepository.updateDeliveryItemById({
            statusUpdate: "completed",
            whereCondition: { deliveryItemId: { [Op.in]: itemIds }, deliveryId },
            transaction,
          });
        } else if (action === "cancel") {
          const itemsCancel = await deliveryRepository.getDeliveryItemByIds(itemIds, transaction);
          if (itemsCancel.length > 0) {
            //return delivery request to 'requested' for re-schedule
            await DeliveryRequest.update(
              { status: "requested" },
              { where: { requestId: { [Op.in]: requestIds } }, transaction },
            );

            //update delivery item status
            await DeliveryItem.update(
              { status: "cancelled" },
              { where: { deliveryItemId: { [Op.in]: itemIds } }, transaction },
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
      const data = await deliveryRepository.getAllDeliveryPlanByDate({ deliveryDate });

      await exportDeliveryExcelResponse(res, {
        data: data,
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

  //=================================PREPARE GOODS=====================================
  getRequestPrepareGoods: async (deliveryDate: Date) => {
    try {
      const finalData = await deliveryRepository.getAllDeliveryPlanByDate({
        deliveryDate,
        itemStatus: "requested",
      });

      return { message: "get schedule delivery successfully", data: finalData };
    } catch (error) {
      console.error("❌ Get request prepare goods failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  requestOrPrepareGoods: async (deliveryItemId: number, isRequest: string) => {
    try {
      return await runInTransaction(async (transaction) => {
        const item = await DeliveryItem.findByPk(deliveryItemId, { transaction });
        if (!item) {
          throw AppError.BadRequest("item not found", "ITEM_NOT_FOUND");
        }

        // CHỨC NĂNG 1: Gửi yêu cầu (Chuyển từ planned -> requested)
        if (isRequest === "true") {
          if (item.status === "planned") {
            await item.update({ status: "requested" }, { transaction });

            return { message: "Gửi yêu cầu xuất hàng thành công" };
          }

          if (item.status === "requested") {
            throw AppError.BadRequest("Đơn này đã được yêu cầu rồi", "ALREADY_REQUESTED");
          }

          throw AppError.BadRequest(
            "Trạng thái hiện tại không thể thực hiện yêu cầu",
            "INVALID_STATUS",
          );
        }

        // CHỨC NĂNG 2: Chuẩn bị hàng (Chuyển từ requested -> prepared)
        else {
          if (item.status === "requested") {
            await item.update({ status: "prepared" }, { transaction });
            return { message: "Xác nhận chuẩn bị hàng xong" };
          }

          // Chặn nếu đơn chưa ở trạng thái requested
          throw AppError.BadRequest(
            "Chỉ có thể chuẩn bị hàng cho đơn đã được 'Yêu cầu'",
            "NOT_REQUESTED_YET",
          );
        }
      });
    } catch (error) {
      console.error("❌ request prepare goods failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  //=================================SOCKET=====================================
  notifyRequestPrepareGoods: async (req: Request) => {
    try {
      const item: any = { message: "Có đơn hàng mới cần chuẩn bị hàng" };

      //bắt buộc có event để socket.on bên client có thể nhận, nếu không có event sẽ không nhận được data
      req.io?.to("prepare-goods").emit("prepare-goods-event", item);

      return { message: "Đã gửi yêu cầu chuẩn bị hàng" };
    } catch (error) {
      console.error("❌Lỗi khi gửi socket:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },
};
