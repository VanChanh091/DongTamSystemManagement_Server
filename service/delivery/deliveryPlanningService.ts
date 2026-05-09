import { AppError } from "../../utils/appError";
import { deliveryRepository } from "../../repository/deliveryRepository";
import { runInTransaction } from "../../utils/helper/transactionHelper";
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

      return await runInTransaction(async (transaction) => {
        // get or create delivery plan
        const [plan] = await deliveryRepository.findOrCreateDeliveryPlan(deliveryDate, transaction);

        const existingItems = plan.DeliveryItems ?? [];
        const incomingRequestIds = items.map((i) => i.requestId);

        // Xác định các Request bị loại khỏi kế hoạch
        const itemsToDelete = existingItems.filter(
          (i) => !incomingRequestIds.includes(i.requestId),
        );
        const requestIdsToReset = itemsToDelete.map((i) => i.requestId);

        // Chuẩn bị dữ liệu để đồng bộ
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
            status: existingItem ? existingItem.status : "none",
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
};
