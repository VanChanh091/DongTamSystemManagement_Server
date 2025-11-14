import { Op, Sequelize } from "sequelize";
import { Box } from "../models/order/box";
import { Order } from "../models/order/order";
import { Customer } from "../models/customer/customer";
import { Product } from "../models/product/product";
import { User } from "../models/user/user";
import {
  createDataTable,
  generateOrderId,
  updateChildOrder,
  validateCustomerAndProduct,
} from "../utils/helper/modelHelper/orderHelpers";
import { AppError } from "../utils/appError";
import redisCache from "../configs/redisCache";

export const getOrderByStatus = async ({
  statusList,
  userId,
  role,
  page = 1,
  pageSize = 30,
  ownOnly,
  isPaging = true,
}: {
  statusList: string[];
  userId: number;
  role: string;
  page?: number;
  pageSize?: number;
  ownOnly?: string;
  isPaging?: boolean;
}) => {
  let whereCondition: any = { status: { [Op.in]: statusList } };

  if ((role !== "admin" && role !== "manager") || ownOnly === "true") {
    whereCondition.userId = userId;
  }

  const queryOptions: any = {
    where: whereCondition,
    attributes: { exclude: ["createdAt", "updatedAt"] },
    include: [
      { model: Customer, attributes: ["customerName", "companyName"] },
      { model: Product, attributes: ["typeProduct", "productName", "maKhuon"] },
      { model: Box, as: "box", attributes: { exclude: ["createdAt", "updatedAt"] } },
      { model: User, attributes: ["fullName"] },
    ],
    order: [
      //1. sort theo accept -> planning
      [Sequelize.literal(`CASE WHEN status = '${statusList[0]}' THEN 0 ELSE 1 END`), "ASC"],
      //2. sort theo 3 số đầu của orderId
      [Sequelize.literal("CAST(SUBSTRING_INDEX(`Order`.`orderId`, '/', 1) AS UNSIGNED)"), "ASC"],
      //3. nếu trùng orderId thì sort theo dateRequestShipping
      ["dateRequestShipping", "ASC"],
    ],
  };

  const order = await Order.findAndCountAll(queryOptions);

  if (isPaging) {
    queryOptions.offset = (page - 1) * pageSize;
    queryOptions.limit = pageSize;
    const { count, rows } = order;
    return {
      data: rows,
      totalOrders: count,
      totalPages: Math.ceil(count / pageSize),
      currentPage: page,
    };
  }

  const rows = await Order.findAll(queryOptions);
  return { data: rows };
};

//create order service
export const createOrderService = async ({
  userId,
  prefix,
  customerId,
  productId,
  box,
  ...orderData
}: {
  userId: number;
  prefix: string;
  customerId: string;
  productId: string;
  box?: any;
  [key: string]: any;
}) => {
  const validation = await validateCustomerAndProduct(customerId, productId);
  if (!validation.success) throw AppError.NotFound(validation.message);

  //create id + number auto increase
  const newOrderId = await generateOrderId(prefix);

  //create order
  const newOrder = await Order.create({
    orderId: newOrderId,
    customerId: customerId,
    productId: productId,
    userId: userId,
    ...orderData,
  });

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

  await redisCache.del(`orders:${userId}:pending_reject`);

  return { newOrder, newOrderId };
};

//update order service
export const updateOrderService = async ({
  userId,
  orderId,
  box,
  ...orderData
}: {
  orderId: string;
  userId: number;
  box?: any;
  [key: string]: any;
}) => {
  const order = await Order.findOne({ where: { orderId } });
  if (!order) {
    throw AppError.NotFound("Order not found");
  }

  await order.update({
    ...orderData,
  });

  if (order.isBox) {
    await updateChildOrder(orderId, Box, box);
  } else {
    await Box.destroy({ where: { orderId } });
  }

  await redisCache.del(`orders:${userId}:pending_reject`);
  return order;
};

//delete order service
export const deleteOrderService = async ({
  orderId,
  userId,
}: {
  orderId: string;
  userId: number;
}) => {
  const deleted = await Order.destroy({ where: { orderId } });
  if (deleted === 0) {
    throw AppError.NotFound("Order không tồn tại");
  }

  await redisCache.del(`orders:${userId}:pending_reject`);
  return true;
};
