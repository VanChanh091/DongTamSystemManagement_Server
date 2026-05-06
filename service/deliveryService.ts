import dotenv from "dotenv";
dotenv.config();

import { Op, Transaction } from "sequelize";
import { Request, Response } from "express";
import { AppError } from "../utils/appError";
import { Order } from "../models/order/order";
import { meiliService } from "./meiliService";
import { MEILI_INDEX } from "../assets/labelFields";
import { CacheKey } from "../utils/helper/cache/cacheKey";
import { PlanningBox } from "../models/planning/planningBox";
import { DeliveryPlan } from "../models/delivery/deliveryPlan";
import { QcSession } from "../models/qualityControl/qcSession";
import { DeliveryItem } from "../models/delivery/deliveryItem";
import { orderRepository } from "../repository/orderRepository";
import redisCache from "../assets/configs/connect/redis.connect";
import { PlanningPaper } from "../models/planning/planningPaper";
import { CacheManager } from "../utils/helper/cache/cacheManager";
import { DeliveryRequest } from "../models/delivery/deliveryRequest";
import { runInTransaction } from "../utils/helper/transactionHelper";
import { deliveryRepository } from "../repository/deliveryRepository";
import { warehouseRepository } from "../repository/warehouseRepository";
import { calculateVolume } from "../utils/helper/modelHelper/orderHelpers";
import { exportDeliveryExcelResponse } from "../utils/helper/excelExporter";
import { meiliClient } from "../assets/configs/connect/meilisearch.connect";
import { meiliTransformer } from "../assets/configs/meilisearch/meiliTransformer";
import { deliveryColumns, mappingDeliveryRow } from "../utils/mapping/deliveryRowAndComlumn";

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

      const plannings = await deliveryRepository.getPlanningEstimateTime(dayStart, userId, all);

      //filter
      const filtered = deliveryService.filterPlanningEstimateTime({
        plannings,
        dayStart,
        estimateTime,
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

  getPlanningEstimateByField: async ({
    page = 1,
    pageSize = 20,
    dayStart,
    estimateTime,
    userId,
    all = "false",
    field,
    keyword,
  }: {
    page?: number;
    pageSize?: number;
    dayStart: Date;
    estimateTime: string;
    userId: number;
    all: string;
    field: string;
    keyword: string;
  }) => {
    const filterStatus = ["stop", "cancel"];
    const index = meiliClient.index("planningPapers");

    try {
      const validFields = ["orderId", "customerName"];
      if (!validFields.includes(field)) {
        throw AppError.BadRequest(`Field '${field}' is not supported for search`, "INVALID_FIELD");
      }

      const searchResult = await index.search(keyword, {
        attributesToSearchOn: [field],
        attributesToRetrieve: ["planningId"],
        filter: `status NOT IN ${JSON.stringify(filterStatus)}`,
        page: Number(page) || 1,
        hitsPerPage: Number(pageSize) || 25, //pageSizes
      });

      const planningIds = searchResult.hits.map((hit: any) => hit.planningId);
      if (planningIds.length === 0) {
        return {
          message: "No planning papers found",
          data: [],
          totalPlannings: 0,
          totalPages: 0,
          currentPage: page,
        };
      }

      const plannings = await deliveryRepository.getPlanningEstimateTime(dayStart, userId, all);

      const filtered = deliveryService.filterPlanningEstimateTime({
        plannings,
        dayStart,
        estimateTime,
      });

      const data = planningIds
        .map((id) => filtered.find((p) => p.planningId === id))
        .filter(Boolean);

      const finalData = data.map((p: any) => {
        const plain = typeof p.get === "function" ? p.get({ plain: true }) : p;
        delete plain.PlanningBox;
        return plain;
      });

      return {
        message: `Search by ${field} from Meilisearch & DB`,
        data: finalData,
        totalPlannings: searchResult.totalHits,
        totalPages: searchResult.totalPages,
        currentPage: searchResult.page,
      };
    } catch (error) {
      console.error(`Failed to get planning estimate by ${field}`, error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  filterPlanningEstimateTime: ({
    plannings,
    dayStart,
    estimateTime,
  }: {
    plannings: any[];
    dayStart: Date;
    estimateTime: string;
  }) => {
    // mốc kết thúc NGÀY HÔM NAY
    const [estH, estM] = estimateTime.split(":").map(Number);
    const estimateMinutes = estH * 60 + estM;

    return plannings.filter((paper) => {
      if (paper.status === "complete") return true;

      //check day
      if (!paper.dayStart) return false;
      const paperDate = new Date(paper.dayStart).setHours(0, 0, 0, 0);
      const targetDate = new Date(dayStart).setHours(0, 0, 0, 0);

      // console.log(
      //   `paperDate: ${paperDate} - targetDate: ${targetDate} - compare: ${paperDate < targetDate}`,
      // );

      //if paper date < target date → show
      if (paperDate < targetDate) return true;

      // console.log(`estimateMinutes: ${estimateMinutes}`);

      // KHÔNG CÓ BOX → so paper
      if (!paper.hasBox) {
        if (!paper.timeRunning) return false;

        const [h, m, s = "0"] = paper.timeRunning.split(":");
        const paperMinutes = Number(h) * 60 + Number(m) + Number(s) / 60;

        // console.log(`time paper: ${paperMinutes}`);
        // console.log(`compare paper: ${paperMinutes <= estimateMinutes}`);

        return paperMinutes <= estimateMinutes;
      } else {
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
      }
    });
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
        const planning = await deliveryRepository.getPaperWaitingRegister(planningId, transaction);
        if (!planning) {
          throw AppError.BadRequest("Planning không tồn tại", "PLANNING_NOT_FOUND");
        }

        const newDeliveryStatus = qtyRegistered === planning.qtyProduced ? "delivered" : "pending";

        //calculate volume
        const volume = await calculateVolume({
          flute: planning.Order.flute!,
          lengthCustomer: planning.Order.lengthPaperCustomer,
          sizeCustomer: planning.Order.paperSizeCustomer,
          quantity: qtyRegistered,
          transaction,
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

  closePlanning: async ({ ids, isPaper = true }: { ids: number | number[]; isPaper: boolean }) => {
    try {
      return await runInTransaction(async (transaction) => {
        const idArray = Array.isArray(ids) ? ids : [ids];
        const keyId = isPaper ? "planningId" : "planningBoxId";

        // Lấy dữ liệu Planning
        let plannings: any[] = [];
        if (isPaper) {
          plannings = await PlanningPaper.findAll({
            where: { [keyId]: idArray },
            transaction,
          });
        } else {
          plannings = await PlanningBox.findAll({
            where: { [keyId]: idArray },
            transaction,
          });
        }

        if (plannings.length === 0) {
          throw AppError.BadRequest("Không tìm thấy dữ liệu để đóng", "PLANNING_NOT_FOUND");
        }

        // Kiểm tra tổng Inbound từ Warehouse
        const inboundSums = await warehouseRepository.getInboundSumByPlanning(keyId, idArray);
        const inboundMap = new Map(
          inboundSums.map((item: any) => [item[keyId], Number(item.totalInbound) || 0]),
        );

        // Validation
        const orderIds = new Set<string>(); // Dùng Set để tránh trùng lặp ID

        for (const p of plannings) {
          const totalInbound = inboundMap.get(p[keyId]) || 0;
          const qtyProduced = p.qtyProduced || 0;
          const orderId = p.orderId;

          if (orderId) orderIds.add(orderId);

          // Kiểm tra đã sản xuất chưa
          if (qtyProduced === 0) {
            throw AppError.BadRequest(
              `Không thể đóng đơn hàng chưa sản xuất: ${orderId}`,
              "CANNOT_CLOSE_EMPTY_PAPER",
            );
          }

          // Kiểm tra đã có nhập kho chưa
          if (totalInbound <= 0) {
            throw AppError.BadRequest(
              `Đơn hàng: ${orderId} chưa được nhập kho.`,
              "NO_INBOUND_HISTORY",
            );
          }
        }

        // cập nhật trạng thái (FINALIZED)
        const query: any = { where: { [keyId]: idArray }, transaction };

        if (isPaper) {
          await PlanningPaper.update(
            { statusRequest: "finalize", deliveryPlanned: "delivered" },
            query,
          );
        } else {
          await PlanningBox.update({ statusRequest: "finalize" }, query);

          // Logic Master-Detail: Update Paper cha
          const parentIds = [...new Set(plannings.map((p) => p.planningId))];
          await PlanningPaper.update(
            { statusRequest: "finalize" },
            { where: { planningId: parentIds }, transaction },
          );
        }

        // Kết thúc session QC
        await QcSession.update(
          { status: "finalized" },
          { where: { [keyId]: idArray }, transaction },
        );

        if (orderIds.size > 0) {
          const listOrderIds = Array.from(orderIds);

          await Order.update(
            { status: "completed" },
            { where: { orderId: listOrderIds }, transaction },
          );

          //--------------------MEILISEARCH-----------------------
          await deliveryService._syncOrderForMeili(listOrderIds, transaction);
        }

        return {
          message: `Đóng đơn chờ giao thành công`,
          affectedIds: idArray,
        };
      });
    } catch (error) {
      console.error("❌ Close planning failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  //================================DELIVERY PLANNING==================================

  getDeliveryRequest: async () => {
    try {
      const request = await deliveryRepository.getDeliveryRequest();

      return { message: "get planning waiting delivery successfully", data: request };
    } catch (error) {
      console.error("❌ get planning waiting delivery failed:", error);
      throw AppError.ServerError();
    }
  },

  //using for re-order when hasn't confirm delivery
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
      idxOrder: number;
    }[];
  }) => {
    try {
      if (!deliveryDate || !items) {
        throw AppError.BadRequest("Missing delivery data", "INVALID_PAYLOAD");
      }

      // console.log(`item: ${JSON.stringify(items)}`);

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
            idxOrder: item.idxOrder,
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
              await deliveryService._syncOrderForMeili(distinctOrderIds, transaction);
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
