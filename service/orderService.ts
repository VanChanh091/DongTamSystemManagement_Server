import dotenv from "dotenv";
dotenv.config();

import { Op } from "sequelize";
import { Request } from "express";
import { Box } from "../models/order/box";
import { AppError } from "../utils/appError";
import { Order } from "../models/order/order";
import { OrderImage } from "../models/order/orderImage";
import { CacheKey } from "../utils/helper/cache/cacheKey";
import { meiliService } from "./meiliService";
import redisCache from "../assets/configs/connect/redis.connect";
import { orderRepository } from "../repository/orderRepository";
import { CacheManager } from "../utils/helper/cache/cacheManager";
import { runInTransaction } from "../utils/helper/transactionHelper";
import { CrudHelper } from "../repository/helper/crud.helper.repository";
import { meiliClient } from "../assets/configs/connect/meilisearch.connect";
import {
  cachedStatus,
  calculateOrderMetrics,
  createDataTable,
  generateOrderId,
  getOrderByStatus,
  updateChildTable,
  validateCustomerAndProduct,
} from "../utils/helper/modelHelper/orderHelpers";
import { meiliTransformer } from "../assets/configs/meilisearch/meiliTransformer";
import { searchFieldAtribute } from "../interface/types";
import { MEILI_INDEX } from "../assets/labelFields";

const devEnvironment = process.env.NODE_ENV !== "production";
const { order } = CacheKey;

export const orderService = {
  getOrderAcceptted: async (ownOnly: string, user: any) => {
    const { userId, role } = user;

    try {
      const keyRole = role === "admin" || role === "manager" ? "all" : `userId:${userId}`;
      const cacheKey = order.accept(keyRole); //orders:all:accept:page:1

      const { isChanged } = await CacheManager.check(
        [{ model: Order, where: { status: ["accept"] } }],
        "orderAccept",
      );

      if (isChanged) {
        await CacheManager.clear("orderAcceptted", keyRole);
      } else {
        const cachedData = await redisCache.get(cacheKey);
        if (cachedData) {
          if (devEnvironment) console.log("✅ Data Order accept from Redis");
          const parsed = JSON.parse(cachedData);
          return { message: "Get Order from cache", ...parsed };
        }
      }

      // Lấy data đã lọc từ cachedStatus
      const result = await getOrderByStatus({
        statusList: ["accept"],
        userId,
        role,
        ownOnly,
      });

      await redisCache.set(cacheKey, JSON.stringify(result), "EX", 3600);

      return { message: "Get all orders from DB with status: accept", ...result };
    } catch (error) {
      console.error("Error get order acceptted:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  getOrderPendingAndReject: async (ownOnly: string, user: any) => {
    const { userId, role } = user;

    try {
      const keyRole = role === "admin" || role === "manager" ? "all" : `userId:${userId}`;
      const cacheKey = order.pendingReject(keyRole);

      const { isChanged } = await CacheManager.check(
        [{ model: Order, where: { status: ["pending", "reject"] } }],
        "orderPending",
      );

      if (isChanged) {
        await CacheManager.clear("orderPendingReject", keyRole);
      } else {
        const cachedResult = await cachedStatus(redisCache, "pending", "reject", userId, role);

        if (cachedResult) {
          if (devEnvironment) console.log("✅ Data Order pending_reject from Redis");
          return { message: "Get Order from cache", data: cachedResult };
        }
      }

      const result = await getOrderByStatus({
        statusList: ["pending", "reject"],
        userId,
        role,
        ownOnly,
      });

      await redisCache.set(cacheKey, JSON.stringify(result), "EX", 3600);

      return { message: "Get all orders from DB with status: pending and reject", ...result };
    } catch (error) {
      console.error("Error in getOrderPendingAndReject:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  getOrderByField: async ({ field, keyword, user }: searchFieldAtribute) => {
    const { userId, role } = user;

    try {
      const validFields = ["orderId", "customerName", "productName", "QC_box", "price"];
      if (!validFields.includes(field)) {
        throw AppError.BadRequest(`Field '${field}' is not supported for search`, "INVALID_FIELD");
      }

      const index = meiliClient.index("orders");

      // Phân quyền và Trạng thái
      let filters = ["status IN [accept]"];
      if (role !== "admin" && role !== "manager") {
        filters.push(`userId = ${userId}`);
      }

      // Tìm kiếm trên Meilisearch để lấy orderId
      const searchResult = await index.search(keyword, {
        filter: filters.join(" AND "),
        attributesToSearchOn: [field],
        attributesToRetrieve: ["orderId"], // Chỉ lấy orderId
      });

      const orderIds = searchResult.hits.map((hit: any) => hit.orderId);
      if (orderIds.length === 0) {
        return { message: "No orders found", data: [] };
      }

      // Truy vấn DB để lấy data dựa trên orderIds
      const query = orderRepository.buildQueryOptions({
        whereCondition: { orderId: { [Op.in]: orderIds } },
      });
      const fullOrders = await Order.findAll(query);

      // Sắp xếp lại thứ tự của SQL theo đúng thứ tự của Meilisearch
      const finalData = orderIds
        .map((id) => fullOrders.find((order) => order.orderId === id))
        .filter(Boolean);

      return {
        message: "Get orders from Meilisearch & DB successfully",
        data: finalData,
      };
    } catch (error) {
      console.error(`❌ Failed to get orders by ${field}:`, error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  //start get Order for auto complete
  getOrderIdRaw: async (orderId: string) => {
    try {
      const data = await orderRepository.getOrderIdRaw(orderId);

      if (data.length === 0) {
        return { message: "No orderId found", data: [] };
      }

      return { message: "Get orderId raw successfully", data };
    } catch (error) {
      console.error("Error in getOrderIdRaw:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  getOrderDetail: async (orderId: string) => {
    try {
      const data = await orderRepository.getOrderDetail(orderId);

      if (!data) {
        throw AppError.NotFound("OrderId not found", "ORDER_ID_NOT_FOUND");
      }

      return { message: "Get orderId autocomplete successfully", data };
    } catch (error) {
      console.error("Error in getOrderAutocomplete:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },
  //end get Order for auto complete

  //create order service
  createOrder: async (req: Request) => {
    const { userId } = req.user;
    const { orderData } = req.body;
    const parsedOrderData = typeof orderData === "string" ? JSON.parse(orderData) : orderData;
    const {
      prefix = "DH",
      customerId,
      productId,
      box,
      imageData,
      ...restOrderData
    } = parsedOrderData;

    try {
      return await runInTransaction(async (transaction) => {
        if (!userId) {
          throw AppError.BadRequest("Invalid userId parameter", "INVALID_FIELD");
        }

        const validation = await validateCustomerAndProduct(customerId, productId, transaction);
        if (!validation.success) throw AppError.NotFound(validation.message);

        //create id + number auto increase
        const metrics = await calculateOrderMetrics(restOrderData, transaction);
        const { newOrderId, existingCustomerId } = await generateOrderId(prefix, transaction);

        if (existingCustomerId && existingCustomerId !== customerId) {
          throw AppError.Conflict(
            `Mã đơn hàng: ${newOrderId} đã liên kết với khách hàng ${existingCustomerId}.`,
            "PREFIX_CUSTOMER_MISMATCH",
          );
        }

        //create order
        const newOrder = await Order.create(
          {
            orderId: newOrderId,
            customerId: customerId,
            productId: productId,
            userId: userId,
            ...restOrderData,
            ...metrics,
          },
          { transaction },
        );

        //Cập nhật thông tin hình ảnh
        if (imageData && imageData.imageUrl && imageData.publicId) {
          const newImagePayload = {
            orderId: newOrderId,
            publicId: imageData.publicId,
            imageUrl: imageData.imageUrl,
          };

          await OrderImage.create(newImagePayload, { transaction });
        }

        //create table data
        if (newOrder.isBox) {
          try {
            await createDataTable({
              model: Box,
              data: { orderId: newOrderId, ...box },
              transaction,
            });
          } catch (error) {
            console.error("Error creating related data:", error);
            if (error instanceof AppError) throw error;
            throw AppError.ServerError();
          }
        }

        //--------------------MEILISEARCH-----------------------
        const orderCreated = await orderRepository.findOrderForMeili(newOrderId, transaction);
        if (orderCreated) {
          const flattenData = meiliTransformer.order(orderCreated);
          await meiliService.syncOrUpdateMeiliData({
            indexKey: MEILI_INDEX.ORDERS,
            data: flattenData,
            transaction,
          });
        }

        return { order: newOrder, orderId: newOrderId };
      });
    } catch (error) {
      console.error("Error in getOrderPendingAndReject:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  //update order service
  updateOrder: async (req: Request, orderId: string) => {
    const { orderData } = req.body;
    const parsedOrderData = typeof orderData === "string" ? JSON.parse(orderData) : orderData;
    const { box, imageData, isDeleteImage, ...restOrderData } = parsedOrderData;

    try {
      return await runInTransaction(async (transaction) => {
        const order = await CrudHelper.findOne({
          model: Order,
          whereCondition: { orderId },
          options: { transaction },
        });
        if (!order) {
          throw AppError.NotFound("Order not found");
        }

        const mergedData = { ...order.toJSON(), ...restOrderData };
        const metrics = await calculateOrderMetrics(mergedData, transaction);

        //Cập nhật thông tin hoặc xóa hình ảnh
        if (isDeleteImage) {
          await OrderImage.destroy({ where: { orderId }, transaction });
        } else if (imageData && imageData.imageUrl && imageData.publicId) {
          const existedImg = await OrderImage.findOne({
            where: { orderId },
            transaction,
          });

          const newImagePayload = {
            orderId: orderId,
            publicId: imageData.publicId,
            imageUrl: imageData.imageUrl,
          };

          if (existedImg) {
            await existedImg.update(newImagePayload, { transaction });
          } else {
            await OrderImage.create(newImagePayload, { transaction });
          }
        }

        await order.update({ ...restOrderData, ...metrics }, { transaction });

        if (order.isBox) {
          await updateChildTable({
            model: Box,
            where: { orderId },
            data: { orderId, ...box },
            transaction,
          });
        } else {
          await Box.destroy({ where: { orderId }, transaction });
        }

        //update socket for reject order
        const ownerId = order.userId;
        const badgeCount = await Order.count({
          where: { status: "reject", userId: ownerId },
          transaction,
        });

        req.io?.to(`reject-order-${ownerId}`).emit("updateBadgeCount", {
          type: "REJECTED_ORDER",
          count: badgeCount,
        });

        //--------------------MEILISEARCH-----------------------
        const orderUpdated = await orderRepository.findOrderForMeili(orderId, transaction);

        if (orderUpdated) {
          const flattenData = meiliTransformer.order(orderUpdated);
          await meiliService.syncOrUpdateMeiliData({
            indexKey: MEILI_INDEX.ORDERS,
            data: flattenData,
            transaction,
            isUpdate: true,
          });
        }

        return { message: "Order updated successfully", data: order };
      });
    } catch (error) {
      console.error("Error in getOrderPendingAndReject:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  //delete order service
  deleteOrder: async (orderId: string) => {
    try {
      return await runInTransaction(async (transaction) => {
        const order = await Order.findOne({ where: { orderId }, transaction });
        if (!order) {
          throw AppError.NotFound("Order không tồn tại");
        }

        //save value before delete for meilisearch
        const orderValue = order.orderSortValue;

        await order.destroy({ transaction });

        //--------------------MEILISEARCH-----------------------
        await meiliService.deleteMeiliData(MEILI_INDEX.ORDERS, orderValue, transaction);

        return { message: "Order deleted successfully" };
      });
    } catch (error) {
      console.error("Error in getOrderPendingAndReject:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },
};
