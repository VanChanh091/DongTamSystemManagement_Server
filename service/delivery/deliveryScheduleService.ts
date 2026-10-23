import dotenv from "dotenv";
dotenv.config();

import { Op, Transaction } from "sequelize";
import { Request, Response } from "express";
import { meiliService } from "../system/meiliService";
import { AppError } from "../../utils/appError";
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
import { OutboundDetail } from "../../models/warehouse/outbound/outboundDetail";
import { DeliveryRequest } from "../../models/delivery/deliveryRequest";
import { runInTransaction } from "../../utils/helper/transactionHelper";
import { deliveryRepository } from "../../repository/deliveryRepository";
import { manufactureRepo } from "../../repository/manufactureRepository";
import { inventoryRepository } from "../../repository/inventoryRepository";
import { exportDeliveryExcelResponse } from "../../utils/helper/excelExporter";
import { meiliTransformer } from "../../assets/configs/meilisearch/meiliTransformer";
import { deliveryColumns, mappingDeliveryRow } from "../../utils/mapping/deliveryRowAndComlumn";

const devEnvironment = process.env.NODE_ENV !== "production";
const { schedule } = CacheKey.delivery;

/**
 * Tách thông tin số tấn và số thứ tự phụ từ tên xe
 * Ví dụ: "Xe D 1.9 Tấn 1" -> tonnage: 1.9, subNumber: 1
 *        "Xe D 5 Tấn 2"   -> tonnage: 5,   subNumber: 2
 */
const parseVehicleName = (name?: string | null) => {
  if (!name || typeof name !== "string") {
    return { hasMatch: false, tonnage: Infinity, subNumber: Infinity, raw: "" };
  }

  // Hỗ trợ cả số thập phân dấu chấm (.) hoặc phẩy (,) và không phân biệt hoa thường
  const match = name.match(/(\d+(?:[.,]\d+)?)\s*t[ấa]n(?:\s*(\d+))?/i);
  if (match) {
    return {
      hasMatch: true,
      tonnage: parseFloat(match[1].replace(",", ".")),
      subNumber: match[2] ? parseInt(match[2], 10) : 0,
      raw: name,
    };
  }

  return {
    hasMatch: false,
    tonnage: Infinity,
    subNumber: Infinity,
    raw: name,
  };
};

/**
 * So sánh 2 tên xe theo quy tắc:
 * 1. Tăng dần theo số tấn
 * 2. Nếu bằng nhau về số tấn -> xét tiếp con số sau chữ tấn
 */
const compareVehicleNames = (aName?: string | null, bName?: string | null) => {
  const a = parseVehicleName(aName);
  const b = parseVehicleName(bName);

  if (a.hasMatch && b.hasMatch) {
    if (a.tonnage !== b.tonnage) {
      return a.tonnage - b.tonnage;
    }
    if (a.subNumber !== b.subNumber) {
      return a.subNumber - b.subNumber;
    }
    return a.raw.localeCompare(b.raw, "vi");
  }

  if (a.hasMatch && !b.hasMatch) return -1;
  if (!a.hasMatch && b.hasMatch) return 1;

  return (aName || "").localeCompare(bName || "", "vi");
};

/**
 * Sắp xếp DeliveryItems trong từng DeliveryPlan:
 * 1. sequence (chuyến 1, 2, 3...)
 * 2. vehicleName (tăng dần số tấn, sau đó số sau chữ tấn)
 * 3. idxOrder (thứ tự giao trong chuyến)
 */
const sortDeliveryPlanItems = (plans: any[]) => {
  if (!Array.isArray(plans)) return plans;

  for (const plan of plans) {
    const items = plan.DeliveryItems || plan.dataValues?.DeliveryItems;
    if (Array.isArray(items)) {
      items.sort((a: any, b: any) => {
        const seqA = (a.sequence ?? "").toString();
        const seqB = (b.sequence ?? "").toString();
        const seqCompare = seqA.localeCompare(seqB, "vi", { numeric: true });
        if (seqCompare !== 0) return seqCompare;

        const vehicleNameA =
          a.Vehicle?.vehicleName ?? a.vehicle?.vehicleName ?? a.dataValues?.Vehicle?.vehicleName;
        const vehicleNameB =
          b.Vehicle?.vehicleName ?? b.vehicle?.vehicleName ?? b.dataValues?.Vehicle?.vehicleName;
        const vehicleCompare = compareVehicleNames(vehicleNameA, vehicleNameB);
        if (vehicleCompare !== 0) return vehicleCompare;

        const idxA = Number(a.idxOrder ?? 0);
        const idxB = Number(b.idxOrder ?? 0);
        return idxA - idxB;
      });
    }
  }

  return plans;
};

export const deliveryScheduleService = {
  //=================================SCHEDULE DELIVERY=====================================
  getAllScheduleDelivery: async (deliveryDate: Date) => {
    const cacheKey = schedule.date(deliveryDate);

    try {
      const { isChanged } = await CacheManager.check(
        [
          { model: DeliveryItem },
          { model: OutboundDetail, where: { deliveryItemId: { [Op.ne]: null } } },
        ],
        "schedule",
      );

      if (isChanged) {
        await CacheManager.clear("schedule");
      } else {
        const cachedData = await redisCache.get(cacheKey);
        if (cachedData) {
          if (devEnvironment) console.log("✅ get schedule delivery from cache");
          const parsedData = JSON.parse(cachedData);
          sortDeliveryPlanItems(parsedData);
          return { message: "get all schedule delivery from cache", data: parsedData };
        }
      }

      const finalData = await deliveryRepository.getAllDeliveryPlanByDate({
        deliveryDate,
        status: ["planned", "completed"],
      });

      sortDeliveryPlanItems(finalData);

      //save
      await redisCache.set(cacheKey, JSON.stringify(finalData), "EX", 3600);

      return { message: "get schedule delivery successfully", data: finalData };
    } catch (error) {
      console.error("❌ get schedule delivery failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  //start auto complete
  getDeliveryItemsByOrderId: async (orderId: string) => {
    try {
      const items = await deliveryRepository.searchOrderIdInDeliveryItem(orderId);
      return { message: "get delivery items by orderId successfully", data: items };
    } catch (error) {
      console.error("❌ get delivery items by orderId failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  getDeliveryItemsById: async (deliveryItemId: number) => {
    try {
      const items = await deliveryRepository.getDeliveryItemsById(deliveryItemId);
      return { message: "get delivery items by deliveryItemId successfully", data: items };
    } catch (error) {
      console.error("❌ get delivery items by deliveryItemId failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },
  //end auto complete

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
        // planned: {
        //   message: "Có đơn chưa gửi yêu cầu chuẩn bị hàng",
        //   code: "ITEMS_STILL_REQUESTED",
        // },
        // requested: {
        //   message: "Có đơn chưa chuẩn bị hàng xong",
        //   code: "ITEMS_NOT_READY_PREPARED",
        // },
      };

      return runInTransaction(async (transaction) => {
        const items = await deliveryRepository.getDeliveryItemToUpdateStatus(itemIds, transaction);

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
            whereCondition: { deliveryItemId: { [Op.in]: itemIds } },
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
            const updateTasks: Promise<any>[] = [];

            const inventories = await inventoryRepository.findByOrderIds({
              orderIds: distinctOrderIds,
              transaction,
            });
            const inventoryMap = new Map(inventories.map((inv) => [inv.orderId, inv]));

            const orders = await orderRepository.getOrdersByIds({
              orderIds: distinctOrderIds,
              transaction,
            });
            const orderMap = new Map(orders.map((order) => [order.orderId, order]));

            for (const planningId of distinctPaperIds) {
              const paper = await PlanningPaper.findByPk(planningId, { transaction });

              if (paper && paper.orderId) {
                const currentInventory = inventoryMap.get(paper.orderId);
                const currentOrder = orderMap.get(paper.orderId);
                let isFullyDelivered = false;

                if (currentInventory && currentOrder) {
                  // ĐIỀU KIỆN CHUẨN: So sánh Tổng xuất kho thực tế với Số lượng cần sản xuất gốc
                  // Ví dụ: Nhập 10,010 | Cần sx 10,000 | Xuất đợt một 5,000 -> 5,000 >= 10,000 (False) -> Giữ 'planned'
                  // Xuất đợt hai thêm 5,000 (Tổng xuất 10,000) -> 10,000 >= 10,000 (True) -> delivered
                  isFullyDelivered =
                    currentInventory.totalQtyOutbound >= currentOrder.quantityManufacture;
                }

                updateTasks.push(
                  PlanningPaper.update(
                    { deliveryPlanned: isFullyDelivered ? "delivered" : "planned" },
                    { where: { planningId }, transaction },
                  ),
                );
                updateTasks.push(
                  QcSession.update({ status: "finalized" }, { where: { planningId }, transaction }),
                );
              }
            }

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

            await Promise.all(updateTasks);
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

        //--------------------MEILISEARCH-----------------------
        const requestIds = items.map((i) => i.requestId);
        const requestData = await deliveryRepository.syncManyDeliveryRequestForMeili(
          requestIds,
          transaction,
        );

        if (requestData.length > 0) {
          const flattenData = requestData.map((item) => meiliTransformer.deliveryRequest(item));

          await meiliService.syncOrUpdateMeiliData({
            indexKey: MEILI_INDEX.DELIVERY_REQUEST,
            data: flattenData,
            transaction,
            isUpdate: true,
          });
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
      const ordersForMeili = await orderRepository.syncOrdersForMeili({ orderIds, transaction });

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
      sortDeliveryPlanItems(data);

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
        itemStatus: ["requested", "prepared"],
      });

      sortDeliveryPlanItems(finalData);

      return { message: "get schedule delivery successfully", data: finalData };
    } catch (error) {
      console.error("❌ Get request prepare goods failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  requestOrPreparedGoods: async ({
    deliveryItemIds,
    isRequest,
    empCode,
    lisencePlate,
  }: {
    deliveryItemIds: number[];
    isRequest: Boolean;
    empCode: string;
    lisencePlate?: string;
  }) => {
    try {
      return await runInTransaction(async (transaction) => {
        const items = await DeliveryItem.findAll({
          where: { deliveryItemId: { [Op.in]: deliveryItemIds } },
          transaction,
        });

        if (items.length === 0) {
          throw AppError.BadRequest("Không tìm thấy mục nào", "ITEMS_NOT_FOUND");
        }

        const now = new Date();

        if (isRequest) {
          // Gửi yêu cầu (Chuyển từ planned -> requested)
          const alreadyRequested = items.filter((i) => i.status === "requested");
          if (alreadyRequested.length > 0) {
            throw AppError.BadRequest(
              `Có ${alreadyRequested.length} đơn đã được yêu cầu trước đó`,
              "ALREADY_REQUESTED",
            );
          }

          // Lọc các item có thể update (status = planned)
          const validIds = items.filter((i) => i.status === "planned").map((i) => i.deliveryItemId);
          if (validIds.length > 0) {
            await DeliveryItem.update(
              { status: "requested", dayRequested: now, licensePlate: lisencePlate },
              { where: { deliveryItemId: { [Op.in]: validIds } }, transaction },
            );
          }

          return { message: `Gửi yêu cầu thành công cho ${validIds.length} đơn hàng` };
        } else {
          // Chuẩn bị hàng (Chuyển từ requested -> prepared)
          const employee = await manufactureRepo.getEmployeeByCode(empCode, transaction);
          if (!employee) {
            throw AppError.NotFound("Mã nhân viên không tồn tại", "EMPLOYEE_NOT_FOUND");
          }

          const validIds = items
            .filter((i) => i.status === "requested")
            .map((i) => i.deliveryItemId);

          if (validIds.length > 0) {
            await DeliveryItem.update(
              {
                status: "prepared",
                dayCompleted: now,
                recipient: employee.fullName,
              },
              { where: { deliveryItemId: validIds }, transaction },
            );

            // Xóa cache sau khi cập nhật thành công
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

  updateLicensePlate: async ({
    deliveryItemId,
    newLicensePlate,
  }: {
    deliveryItemId: number;
    newLicensePlate: string;
  }) => {
    try {
      return await runInTransaction(async (transaction) => {
        const deliveryItem = await DeliveryItem.findByPk(deliveryItemId, { transaction });
        if (!deliveryItem) {
          throw AppError.NotFound("Không tìm thấy mục giao hàng", "ITEM_NOT_FOUND");
        }

        await deliveryItem.update({ licensePlate: newLicensePlate }, { transaction });

        return { message: "Cập nhật biển số xe thành công" };
      });
    } catch (error) {
      console.error("❌ update license plate failed:", error);
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
