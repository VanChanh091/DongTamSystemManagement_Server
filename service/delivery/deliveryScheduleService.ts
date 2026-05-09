import dotenv from "dotenv";
dotenv.config();

import { Op, Transaction } from "sequelize";
import { Request, Response } from "express";
import { meiliService } from "../meiliService";
import { AppError } from "../../utils/appError";
import { Order } from "../../models/order/order";
import { MEILI_INDEX } from "../../assets/labelFields";
import { CacheKey } from "../../utils/helper/cache/cacheKey";
import { PlanningBox } from "../../models/planning/planningBox";
import { QcSession } from "../../models/qualityControl/qcSession";
import { DeliveryPlan } from "../../models/delivery/deliveryPlan";
import { DeliveryItem } from "../../models/delivery/deliveryItem";
import { orderRepository } from "../../repository/orderRepository";
import redisCache from "../../assets/configs/connect/redis.connect";
import { PlanningPaper } from "../../models/planning/planningPaper";
import { CacheManager } from "../../utils/helper/cache/cacheManager";
import { DeliveryRequest } from "../../models/delivery/deliveryRequest";
import { runInTransaction } from "../../utils/helper/transactionHelper";
import { deliveryRepository } from "../../repository/deliveryRepository";
import { exportDeliveryExcelResponse } from "../../utils/helper/excelExporter";
import { meiliTransformer } from "../../assets/configs/meilisearch/meiliTransformer";
import { deliveryColumns, mappingDeliveryRow } from "../../utils/mapping/deliveryRowAndComlumn";

const devEnvironment = process.env.NODE_ENV !== "production";
const { estimate, schedule } = CacheKey.delivery;

export const deliveryScheduleService = {
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
      const STATUS_ERROR_MAP: Record<string, { message: string; code: string }> = {
        cancelled: {
          message: "Không thể hoàn thành đơn đã bị hủy.",
          code: "ITEMS_ALREADY_CANCELLED",
        },
        planned: {
          message: "Có đơn chưa gửi yêu cầu chuẩn bị hàng",
          code: "ITEMS_STILL_REQUESTED",
        },
        requested: {
          message: "Có đơn chưa chuẩn bị hàng xong",
          code: "ITEMS_NOT_READY_PREPARED",
        },
      };

      return runInTransaction(async (transaction) => {
        const items = await deliveryRepository.getDeliveryItemToUpdateStatus(
          itemIds,
          deliveryId,
          transaction,
        );

        if (items.length === 0) {
          throw AppError.BadRequest("Không tìm thấy item nào để cập nhật", "ITEMS_NOT_FOUND");
        }

        if (action === "complete") {
          const invalidItem = items.find((i) => i.status in STATUS_ERROR_MAP);

          if (invalidItem) {
            const { message, code } = STATUS_ERROR_MAP[invalidItem.status];
            throw AppError.BadRequest(message, code);
          }

          //update status delivery item
          await deliveryRepository.updateDeliveryItemById({
            statusUpdate: "completed",
            whereCondition: { deliveryItemId: { [Op.in]: itemIds }, deliveryId },
            transaction,
          });

          //finalize QC session and status request
          const paperIds = new Set<number>();
          const boxIds = new Set<number>();
          const orderIds = new Set<string>();

          items.forEach((i) => {
            const paper = i.DeliveryRequest?.PlanningPaper;
            if (paper?.planningId) {
              paperIds.add(paper.planningId);

              if (paper.orderId) {
                orderIds.add(paper.orderId);
              }

              // if hasBox, add boxId to set for update statusRequest
              if (paper.hasBox && paper.PlanningBox?.planningBoxId) {
                boxIds.add(paper.PlanningBox.planningBoxId);
              }
            }
          });

          const distinctPaperIds = Array.from(paperIds);
          const distinctBoxIds = Array.from(boxIds);
          const distinctOrderIds = Array.from(orderIds);

          if (distinctPaperIds.length > 0) {
            const updateTasks: Promise<any>[] = [
              PlanningPaper.update(
                { statusRequest: "finalize", deliveryPlanned: "delivered" },
                { where: { planningId: { [Op.in]: distinctPaperIds } }, transaction },
              ),
              QcSession.update(
                { status: "finalized" },
                { where: { planningId: { [Op.in]: distinctPaperIds } }, transaction },
              ),
            ];

            // Nếu có Box thì add vào updateTaskss
            if (distinctBoxIds.length > 0) {
              updateTasks.push(
                PlanningBox.update(
                  { statusRequest: "finalize" },
                  { where: { planningBoxId: { [Op.in]: distinctBoxIds } }, transaction },
                ),
                QcSession.update(
                  { status: "finalized" },
                  { where: { planningBoxId: { [Op.in]: distinctBoxIds } }, transaction },
                ),
              );
            }

            if (distinctOrderIds.length > 0) {
              updateTasks.push(
                Order.update(
                  { status: "completed" },
                  { where: { orderId: { [Op.in]: distinctOrderIds } }, transaction },
                ),
              );
            }

            await Promise.all(updateTasks);

            if (distinctOrderIds.length > 0) {
              await deliveryScheduleService._syncOrderForMeili(distinctOrderIds, transaction);
            }
          }
        } else if (action === "cancel") {
          const itemsCancel = await deliveryRepository.getDeliveryItemByIds(itemIds, transaction);
          if (itemsCancel.length > 0) {
            //return delivery request to 'requested' for re-schedule
            const requestIds = items.map((i) => i.requestId);

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

  _syncOrderForMeili: async (orderIds: string[], transaction: Transaction) => {
    try {
      const ordersForMeili = await orderRepository.findOrdersForMeili(orderIds, transaction);

      if (ordersForMeili.length > 0) {
        const dataToSync = ordersForMeili.map((o) => meiliTransformer.order(o));
        await meiliService.syncOrUpdateMeiliData({
          indexKey: MEILI_INDEX.ORDERS,
          data: dataToSync,
          transaction,
          isUpdate: true,
        });
      }
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

        if (isRequest === "true") {
          // Gửi yêu cầu (Chuyển từ planned -> requested)
          if (item.status === "requested") {
            throw AppError.BadRequest("Đơn này đã được yêu cầu rồi", "ALREADY_REQUESTED");
          }

          if (item.status === "planned") {
            await item.update({ status: "requested" }, { transaction });
          }

          return { message: "Gửi yêu cầu xuất hàng thành công" };
        } else {
          // Chuẩn bị hàng (Chuyển từ requested -> prepared)
          if (item.status === "requested") {
            await item.update({ status: "prepared" }, { transaction });
            await CacheManager.clear("schedule");
          }

          return { message: "Xác nhận chuẩn bị hàng xong" };
        }
      });
    } catch (error) {
      console.error("❌ request prepare goods failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  //socket
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
