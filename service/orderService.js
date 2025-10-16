import Redis from "ioredis";
import { Op, Sequelize } from "sequelize";
import Box from "../models/order/box.js";
import Order from "../models/order/order.js";
import Customer from "../models/customer/customer.js";
import Product from "../models/product/product.js";
import User from "../models/user/user.js";
import {
  createDataTable,
  generateOrderId,
  updateChildOrder,
  validateCustomerAndProduct,
} from "../utils/helper/orderHelpers.js";
import { AppError } from "../utils/appError.js";

const redisCache = new Redis();

export const getOrderByStatus = async ({
  statusList,
  userId,
  role,
  page,
  pageSize,
  ownOnly,
  isPaging = true,
}) => {
  let whereCondition = { status: { [Op.in]: statusList } };

  if ((role !== "admin" && role !== "manager") || ownOnly === "true") {
    whereCondition.userId = userId;
  }

  const queryOptions = {
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
      [
        Sequelize.literal(`CAST(SUBSTRING_INDEX(\`Order\`.\`orderId\`, '/', 1) AS UNSIGNED)`),
        "ASC",
      ],
      //3. nếu trùng orderId thì sort theo dateRequestShipping
      ["dateRequestShipping", "ASC"],
    ],
  };

  if (isPaging) {
    queryOptions.offset = (page - 1) * pageSize;
    queryOptions.limit = pageSize;
    const { count, rows } = await Order.findAndCountAll(queryOptions);
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
}) => {
  const validation = await validateCustomerAndProduct(customerId, productId);
  if (!validation.success) throw new AppError(validation.message, 400);

  //create id + number auto increase
  const newOrderId = await generateOrderId(prefix);

  //create order
  const newOrder = await Order.create({
    orderId: newOrderId,
    customerId: customerId,
    productId: productId,
    userId,
    ...orderData,
  });

  //create table data
  if (newOrder.isBox) {
    try {
      await createDataTable(newOrderId, Box, box);
    } catch (error) {
      console.error("Error creating related data:", error);
      throw new AppError("Failed to create related data", 500);
    }
  }

  await redisCache.del(`orders:${userId}:pending_reject`);

  return { newOrder, newOrderId };
};

//update order service
export const updateOrderService = async ({ userId, orderId, box, ...orderData }) => {
  const order = await Order.findOne({ where: { orderId } });
  if (!order) {
    throw new AppError("Order not found", 404);
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
export const deleteOrderService = async ({ orderId, userId }) => {
  const deleted = await Order.destroy({ where: { orderId } });
  if (!deleted) {
    throw new AppError("Order delete failed", 404);
  }

  await redisCache.del(`orders:${userId}:pending_reject`);
  return true;
};
