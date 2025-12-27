import dotenv from "dotenv";
dotenv.config();
import {
  cachedStatus,
  createDataTable,
  filterOrdersFromCache,
  generateOrderId,
  getOrderByStatus,
  updateChildOrder,
  validateCustomerAndProduct,
} from "../utils/helper/modelHelper/orderHelpers";
import { AppError } from "../utils/appError";
import redisCache from "../assest/configs/redisCache";
import { CacheManager } from "../utils/helper/cacheManager";
import { Box } from "../models/order/box";
import { Order } from "../models/order/order";
import { runInTransaction } from "../utils/helper/transactionHelper";

const devEnvironment = process.env.NODE_ENV !== "production";
const { order } = CacheManager.keys;

export const orderService = {
  getOrderAcceptAndPlanning: async (page: number, pageSize: number, ownOnly: string, user: any) => {
    const { userId, role } = user;

    try {
      const keyRole = role === "admin" || role === "manager" ? "all" : `userId:${userId}`;
      const cacheKey = order.acceptPlanning(keyRole, page); //orders:admin:accept_planning:page:1
      const { isChanged } = await CacheManager.check(
        [{ model: Order, where: { status: ["accept", "planning"] } }],
        "orderAccept"
      );

      if (isChanged) {
        await CacheManager.clearOrderAcceptPlanning(keyRole);
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
        "orderPending"
      );

      if (isChanged) {
        await CacheManager.clearOrderPendingReject(keyRole);
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
    user: any
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

  //create order service
  createOrder: async (user: any, data: any) => {
    const { userId } = user;
    const { prefix, customerId, productId, box, ...orderData } = data;

    try {
      return await runInTransaction(async (transaction) => {
        if (!userId) {
          throw AppError.BadRequest("Invalid userId parameter", "INVALID_FIELD");
        }

        const validation = await validateCustomerAndProduct(customerId, productId);
        if (!validation.success) throw AppError.NotFound(validation.message);

        //create id + number auto increase
        const newOrderId = await generateOrderId(prefix);

        //create order
        const newOrder = await Order.create(
          {
            orderId: newOrderId,
            customerId: customerId,
            productId: productId,
            userId: userId,
            ...orderData,
          },
          { transaction }
        );

        //create table data
        if (newOrder.isBox) {
          try {
            await createDataTable(newOrderId, Box, box);
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
  updateOrder: async (data: any, orderId: string) => {
    const { box, ...orderData } = data;

    try {
      return await runInTransaction(async (transaction) => {
        const order = await Order.findOne({ where: { orderId } });
        if (!order) {
          throw AppError.NotFound("Order not found");
        }

        await order.update({ ...orderData }, transaction);

        if (order.isBox) {
          await updateChildOrder(orderId, Box, box);
        } else {
          await Box.destroy({ where: { orderId } });
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
