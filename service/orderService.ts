import dotenv from "dotenv";
dotenv.config();

import {
  cachedStatus,
  calculateOrderMetrics,
  createDataTable,
  filterOrdersFromCache,
  generateOrderId,
  getOrderByStatus,
  updateChildOrder,
  validateCustomerAndProduct,
} from "../utils/helper/modelHelper/orderHelpers";
import { AppError } from "../utils/appError";
import redisCache from "../assest/configs/redisCache";
import { CacheManager } from "../utils/helper/cache/cacheManager";
import { Box } from "../models/order/box";
import { Order } from "../models/order/order";
import { runInTransaction } from "../utils/helper/transactionHelper";
import { orderRepository } from "../repository/orderRepository";
import { CacheKey } from "../utils/helper/cache/cacheKey";
import { Request } from "express";
import { convertToWebp, uploadImageToCloudinary } from "../utils/image/converToWebp";
import { OrderImage } from "../models/order/orderImage";

const devEnvironment = process.env.NODE_ENV !== "production";
const { order } = CacheKey;

export const orderService = {
  getOrderAcceptAndPlanning: async (page: number, pageSize: number, ownOnly: string, user: any) => {
    const { userId, role } = user;

    try {
      const keyRole = role === "admin" || role === "manager" ? "all" : `userId:${userId}`;
      const cacheKey = order.acceptPlanning(keyRole, page); //orders:all:accept_planning:page:1

      const { isChanged } = await CacheManager.check(
        [{ model: Order, where: { status: ["accept", "planning"] } }],
        "orderAccept",
      );

      if (isChanged) {
        await CacheManager.clear("orderAcceptPlanning", keyRole);
      } else {
        const cachedData = await redisCache.get(cacheKey);
        if (cachedData) {
          if (devEnvironment) console.log("✅ Data Order accept_planning from Redis");
          const parsed = JSON.parse(cachedData);
          return { message: "Get Order from cache", ...parsed };
        }
      }

      // Lấy data đã lọc từ cachedStatus
      const result = await getOrderByStatus({
        statusList: ["accept", "planning"],
        userId,
        role,
        page: page,
        pageSize: pageSize,
        ownOnly,
        isPaging: true,
      });

      await redisCache.set(cacheKey, JSON.stringify(result), "EX", 3600);

      return { message: "Get all orders from DB with status: accept and planning", ...result };
    } catch (error) {
      console.error("Error in getOrderAcceptAndPlanning:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  getOrderPendingAndReject: async (ownOnly: string, user: any) => {
    const { userId, role } = user;

    try {
      if (!userId) {
        throw AppError.BadRequest("Invalid userId parameter", "INVALID_FIELD");
      }

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
        isPaging: false,
      });

      await redisCache.set(cacheKey, JSON.stringify(result), "EX", 3600);

      return { message: "Get all orders from DB with status: pending and reject", ...result };
    } catch (error) {
      console.error("Error in getOrderPendingAndReject:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  getOrderByField: async (
    field: string,
    keyword: string,
    page: number,
    pageSize: number,
    user: any,
  ) => {
    const { userId, role } = user;

    try {
      const fieldMap = {
        orderId: (order: Order) => order.orderId,
        customerName: (order: Order) => order?.Customer?.customerName,
        productName: (order: Order) => order?.Product?.productName,
        qcBox: (order: Order) => order?.QC_box,
        price: (order: Order) => order?.price,
      } as const;

      const key = field as keyof typeof fieldMap;

      if (!fieldMap[key]) {
        throw AppError.BadRequest("Invalid field parameter", "INVALID_FIELD");
      }

      const result = await filterOrdersFromCache({
        userId,
        role,
        keyword,
        getFieldValue: fieldMap[key],
        page,
        pageSize,
        cacheKeyPrefix: order.searchAcceptPlanning,
        message: `Get orders by ${field} from filtered cache`,
      });

      return result;
    } catch (error) {
      console.error(`Failed to get orders by ${field}:`, error);
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
    const { prefix = "DH", customerId, productId, box, ...restOrderData } = parsedOrderData;

    try {
      return await runInTransaction(async (transaction) => {
        if (!userId) {
          throw AppError.BadRequest("Invalid userId parameter", "INVALID_FIELD");
        }

        const validation = await validateCustomerAndProduct(customerId, productId);
        if (!validation.success) throw AppError.NotFound(validation.message);

        //create id + number auto increase
        const metrics = await calculateOrderMetrics(restOrderData);
        const { newOrderId, existingCustomerId } = await generateOrderId(prefix);

        if (existingCustomerId && existingCustomerId !== customerId) {
          throw AppError.Conflict(
            `Khách hàng cho mã đơn hàng ${prefix} không trùng khớp.`,
            "PREFIX_CUSTOMER_MISMATCH",
          );
        }

        let imageData = null;

        //upload image
        if (req.file) {
          const webpBuffer = await convertToWebp(req.file.buffer);

          const sanitizeOrderId = newOrderId
            .replace(/\s+/g, "_") // Xử lý khoảng trắng
            .replace(/\//g, "_"); // thay dấu / bằng _

          const result = await uploadImageToCloudinary({
            buffer: webpBuffer,
            folder: "orders",
            publicId: sanitizeOrderId,
          });

          imageData = {
            orderId: newOrderId,
            publicId: result.public_id,
            imageUrl: result.secure_url,
          };
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

        if (imageData) {
          await OrderImage.create(imageData, { transaction });
        }

        //create table data
        if (newOrder.isBox) {
          try {
            await createDataTable(newOrderId, Box, box, transaction);
          } catch (error) {
            console.error("Error creating related data:", error);
            if (error instanceof AppError) throw error;
            throw AppError.ServerError();
          }
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
    const { box, ...restOrderData } = parsedOrderData;

    try {
      return await runInTransaction(async (transaction) => {
        const order = await Order.findOne({ where: { orderId } });
        if (!order) {
          throw AppError.NotFound("Order not found");
        }

        const mergedData = { ...order.toJSON(), ...restOrderData };
        const metrics = await calculateOrderMetrics(mergedData);

        let imageData = null;

        //upload image
        if (req.file) {
          const webpBuffer = await convertToWebp(req.file.buffer);

          const sanitizeOrderId = orderId
            .replace(/\s+/g, "_") // Xử lý khoảng trắng
            .replace(/\//g, "_"); // thay dấu / bằng _

          const result = await uploadImageToCloudinary({
            buffer: webpBuffer,
            folder: "orders",
            publicId: sanitizeOrderId,
          });

          imageData = {
            orderId: orderId,
            publicId: result.public_id,
            imageUrl: result.secure_url,
          };
        }

        if (imageData) {
          const existingImage = await OrderImage.findOne({ where: { orderId }, transaction });

          if (existingImage) {
            await existingImage.update(imageData, { transaction });
          } else {
            await OrderImage.create(imageData, { transaction });
          }
        }

        await order.update({ ...restOrderData, ...metrics }, { transaction });

        if (order.isBox) {
          await updateChildOrder(orderId, Box, box);
        } else {
          await Box.destroy({ where: { orderId } });
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
        const deleted = await Order.destroy({ where: { orderId }, transaction });
        if (deleted === 0) {
          throw AppError.NotFound("Order không tồn tại");
        }

        return { message: "Order deleted successfully" };
      });
    } catch (error) {
      console.error("Error in getOrderPendingAndReject:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },
};
