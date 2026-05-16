import { Op } from "sequelize";
import { meiliService } from "../meiliService";
import { AppError } from "../../utils/appError";
import { MEILI_INDEX } from "../../assets/labelFields";
import { PlanningPaper } from "../../models/planning/planningPaper";
import { runInTransaction } from "../../utils/helper/transactionHelper";
import { DeliveryRequest } from "../../models/delivery/deliveryRequest";
import { deliveryRepository } from "../../repository/deliveryRepository";
import { meiliClient } from "../../assets/configs/connect/meilisearch.connect";

export const deliveryPlanningService = {
  getDeliveryRequest: async () => {
    try {
      const request = await deliveryRepository.getDeliveryRequest({});

      return { message: "get planning waiting delivery successfully", data: request };
    } catch (error) {
      console.error("❌ get planning waiting delivery failed:", error);
      throw AppError.ServerError();
    }
  },

  getDeliveryRequestByField: async (field: string, keyword: string) => {
    try {
      const validFields = ["orderId", "customerName"];
      if (!validFields.includes(field)) {
        throw AppError.BadRequest(`Field '${field}' is not supported for search`, "INVALID_FIELD");
      }

      const index = meiliClient.index("deliveryRequest");

      // Tìm kiếm trên Meilisearch để lấy orderId
      const searchResult = await index.search(keyword, {
        filter: 'status = "requested"',
        attributesToSearchOn: [field],
        attributesToRetrieve: ["requestId"], // Chỉ lấy requestId
      });

      const requestIds = searchResult.hits.map((hit: any) => hit.requestId);
      if (requestIds.length === 0) {
        return { message: "No delivery requests found", data: [] };
      }

      const request = await deliveryRepository.getDeliveryRequest({
        isSearch: "true",
        requestId: requestIds,
      });

      // Sắp xếp lại thứ tự của SQL theo đúng thứ tự của Meilisearch
      const finalData = requestIds
        .map((id) => request.find((r) => r.requestId === id))
        .filter(Boolean);

      return {
        message: "Get delivery request from Meilisearch & DB successfully",
        data: finalData,
      };
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

  //lưu kế hoạch giao hàng
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
      return await runInTransaction(async (transaction) => {
        if (!deliveryDate || !items) {
          throw AppError.BadRequest("Missing delivery data", "INVALID_PAYLOAD");
        }

        // get or create delivery plan
        const [plan] = await deliveryRepository.findOrCreateDeliveryPlan(deliveryDate, transaction);

        const existingItems = plan.DeliveryItems ?? [];
        const incomingRequestIds = items.map((i) => i.requestId);
        const itemsToDelete = existingItems.filter(
          (i) => !incomingRequestIds.includes(i.requestId),
        );

        //==========================Handle item bị xóa khỏi xe===============================
        if (itemsToDelete.length > 0) {
          const deleteItemIds = itemsToDelete.map((i) => i.deliveryItemId);

          const requestIdsToReset = itemsToDelete.map((i) => i.requestId);
          const planningIdsToReset = [
            ...new Set(itemsToDelete.map((i) => i.DeliveryRequest?.planningId).filter(Boolean)),
          ];

          await deliveryRepository.destroyItemById(deleteItemIds, transaction);

          // Trả trạng thái DeliveryRequest về 'requested' để có thể xếp chuyến khác
          await deliveryRepository.updateRequestStatus(requestIdsToReset, "requested", transaction);

          // Cập nhật PlanningPaper -> 'pending'
          if (planningIdsToReset.length > 0) {
            await PlanningPaper.update(
              { deliveryPlanned: "pending" },
              { where: { planningId: { [Op.in]: planningIdsToReset } }, transaction },
            );
          }
        }

        //==========================Handle item được thêm vào xe===============================
        if (items.length > 0) {
          const existingMap = new Map(existingItems.map((i) => [i.requestId, i]));

          const allItemsToSync = items.map((item) => {
            const existing = existingMap.get(item.requestId);

            return {
              ...(existing ? { deliveryItemId: existing.deliveryItemId } : {}),
              deliveryId: plan.deliveryId,
              requestId: item.requestId,
              vehicleId: item.vehicleId,
              sequence: item.sequence,
              note: item.note ?? "",
              status: existing ? existing.status : "none",
              idxOrder: item.idxOrder,
            };
          });

          // Cập nhật hoặc thêm mới các Item vào chuyến xe
          await deliveryRepository.bulkUpsert(allItemsToSync, transaction);

          // Cập nhật trạng thái các DeliveryRequest
          await deliveryRepository.updateRequestStatus(
            incomingRequestIds,
            "scheduled",
            transaction,
          );

          // Chỉ tìm planningId của những request mà ta chưa biết (những thằng mới thêm vào)
          const newRequestIds = items
            .filter((i) => !existingMap.has(i.requestId))
            .map((i) => i.requestId);

          // Lấy planningId từ existing items đã có sẵn
          const knownPlanningIds = items
            .filter((i) => existingMap.has(i.requestId))
            .map((i) => existingMap.get(i.requestId)?.DeliveryRequest?.planningId)
            .filter(Boolean);

          let finalPlanningIdsToPlanned = [...knownPlanningIds];

          if (newRequestIds.length > 0) {
            const newRequests = await DeliveryRequest.findAll({
              where: { requestId: newRequestIds },
              attributes: ["planningId"],
              transaction,
            });
            newRequests.forEach((r) => {
              if (r.planningId) finalPlanningIdsToPlanned.push(r.planningId);
            });
          }

          // 1 Query Update duy nhất cho PlanningPaper
          const uniquePlanningIds = [...new Set(finalPlanningIdsToPlanned)].filter(
            (id): id is number => id !== null && id !== undefined,
          );

          if (uniquePlanningIds.length > 0) {
            await PlanningPaper.update(
              { deliveryPlanned: "planned" },
              { where: { planningId: { [Op.in]: uniquePlanningIds } }, transaction },
            );
          }
        }

        return { message: "Sync delivery plan success" };
      });
    } catch (error) {
      console.error("❌ Sync delivery plan failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  //triển khai kế hoạch giao hàng
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

  backDeliveryRequest: async (requestIds: number | number[]) => {
    try {
      return runInTransaction(async (transaction) => {
        const idArray = Array.isArray(requestIds) ? requestIds : [requestIds];
        const requests = await deliveryRepository.getDeliveryPlanByIds({
          requestId: idArray,
          transaction,
        });

        if (requests.length === 0) {
          throw AppError.NotFound(
            "Không tìm thấy yêu cầu giao hàng để trả về",
            "DELIVERY_REQUEST_NOT_FOUND",
          );
        }

        const planningIds = [...new Set(requests.map((r) => r.planningId))];

        await DeliveryRequest.destroy({
          where: { requestId: { [Op.in]: idArray } },
          transaction,
        });

        for (const pId of planningIds) {
          const remainingCount = await DeliveryRequest.count({
            where: { planningId: pId },
            transaction,
          });

          const newStatus = remainingCount === 0 ? "none" : "pending";

          await PlanningPaper.update(
            { deliveryPlanned: newStatus },
            { where: { planningId: pId }, transaction },
          );
        }

        //--------------------MEILISEARCH-----------------------
        await meiliService.deleteMeiliData(MEILI_INDEX.DELIVERY_REQUEST, idArray, transaction);

        return { message: "Trả yêu cầu giao hàng thành công" };
      });
    } catch (error) {
      console.error("❌ Back delivery request to planning failed:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },
};
