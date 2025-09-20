import Redis from "ioredis";
import Order from "../../../models/order/order.js";
import { Op } from "sequelize";
import Customer from "../../../models/customer/customer.js";
import Box from "../../../models/order/box.js";
import User from "../../../models/user/user.js";
import Product from "../../../models/product/product.js";
import {
  createDataTable,
  generateOrderId,
  updateChildOrder,
  validateCustomerAndProduct,
  cachedStatus,
  filterOrdersFromCache,
} from "../../../utils/helper/orderHelpers.js";

const redisCache = new Redis();

//===============================ACCEPT AND PLANNING=====================================

//get order status accept and planning
export const getOrderAcceptAndPlanning = async (req, res) => {
  const { userId, role } = req.user;
  const { page, pageSize, refresh = false, ownOnly = false } = req.query;
  const currentPage = Number(page);
  const currentPageSize = Number(pageSize);

  try {
    const keyRole = role === "admin" || role === "manager" ? "all" : `userId:${userId}`;
    const cacheKey = `orders:${keyRole}:accept_planning:page:${currentPage}`; //orders:admin:accept_planning:page:1

    if (refresh == "true") {
      await redisCache.del(cacheKey);
    }

    // Lấy data đã lọc từ cachedStatus
    const cachedData = await redisCache.get(cacheKey);
    if (cachedData) {
      const parsed = JSON.parse(cachedData);

      const filteredData = await cachedStatus(parsed, "accept", "planning", userId, role);

      if (filteredData) {
        console.log("✅ Get Order from cache");
        return res.status(200).json({
          message: "Get Order from cache",
          data: filteredData,
          totalOrders: parsed.totalOrders,
          totalPages: parsed.totalPages,
          currentPage: parsed.currentPage,
        });
      }
    }

    let whereCondition = { status: { [Op.in]: ["accept", "planning"] } };
    if (role == "admin") {
    } else if (role == "manager") {
      if (ownOnly == "true") {
        whereCondition = { userId, ...whereCondition };
      }
    } else {
      whereCondition = { userId, ...whereCondition };
    }

    const totalOrders = await Order.count({ where: whereCondition });
    const totalPages = Math.ceil(totalOrders / currentPageSize);
    const offset = (currentPage - 1) * currentPageSize;

    //find data from db
    const data = await Order.findAll({
      where: whereCondition,
      attributes: { exclude: ["createdAt", "updatedAt"] },
      include: [
        { model: Customer, attributes: ["customerName", "companyName"] },
        {
          model: Product,
          attributes: ["typeProduct", "productName", "maKhuon"],
        },
        {
          model: Box,
          as: "box",
          attributes: { exclude: ["createdAt", "updatedAt"] },
        },
        { model: User, attributes: ["fullName"] },
      ],
      order: [["createdAt", "DESC"]],
      offset,
      limit: currentPageSize,
    });

    // Lưu cache gồm: data + meta info
    await redisCache.set(
      cacheKey,
      JSON.stringify({
        data,
        totalOrders,
        totalPages,
        currentPage,
      }),
      "EX",
      1800
    );

    res.status(200).json({
      message: "Get all orders from DB with status: accept and planning",
      data,
      totalOrders,
      totalPages,
      currentPage,
    });
  } catch (error) {
    console.error("Error in getOrderAcceptAndPlanning:", error);
    res.status(500).json({ message: "Server error" });
  }
};

//get by customer name
export const getOrderByCustomerName = async (req, res) => {
  const { userId, role } = req.user;
  const { name, page, pageSize } = req.query;

  const result = await filterOrdersFromCache({
    userId,
    role,
    keyword: name,
    getFieldValue: (order) => order?.Customer?.customerName,
    page,
    pageSize,
    cacheKeyPrefix: `orders:accept_planning`,
    message: "Get orders by customer name from filtered cache",
  });

  return res.status(200).json(result);
};

//get by product name
export const getOrderByProductName = async (req, res) => {
  const { userId, role } = req.user;
  const { productName, page, pageSize } = req.query;

  const result = await filterOrdersFromCache({
    userId,
    role,
    keyword: productName,
    getFieldValue: (order) => order?.Product?.productName,
    page,
    pageSize,
    cacheKeyPrefix: `orders:accept_planning`,
    message: "Get orders by product name from filtered cache",
  });

  return res.status(200).json(result);
};

//get by QC box
export const getOrderByQcBox = async (req, res) => {
  const { userId, role } = req.user;
  const { QcBox, page, pageSize } = req.query;

  const result = await filterOrdersFromCache({
    userId,
    role,
    keyword: QcBox,
    getFieldValue: (order) => order?.QC_box,
    page,
    pageSize,
    cacheKeyPrefix: `orders:accept_planning`,
    message: "Get orders by QC box from filtered cache",
  });

  return res.status(200).json(result);
};

//get by price
export const getOrderByPrice = async (req, res) => {
  const { userId, role } = req.user;
  const { price, page, pageSize } = req.query;

  try {
    const result = await filterOrdersFromCache({
      userId,
      role,
      keyword: price,
      getFieldValue: (order) => order?.price,
      page,
      pageSize,
      cacheKeyPrefix: `orders:accept_planning`,
      message: "Get orders by price from filtered cache",
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Failed to get by price:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

//===============================PENDING AND REJECT=====================================

//get order pending and reject
export const getOrderPendingAndReject = async (req, res) => {
  const { userId, role } = req.user;
  const { refresh = false, ownOnly = false } = req.query;

  if (!userId) {
    return res.status(400).json({ message: "Missing userId" });
  }

  try {
    const keyRole = role === "admin" || role === "manager" ? "all" : `userId:${userId}`;
    const cacheKey = `orders:${keyRole}:pending_reject`;

    if (refresh == "true") {
      await redisCache.del(cacheKey);
    }

    const cachedResult = await cachedStatus(
      cacheKey,
      redisCache,
      "pending",
      "reject",
      userId,
      role
    );

    if (cachedResult) {
      console.log("✅ Get Order from cache");
      return res.status(200).json({
        message: "Get Order from cache",
        data: cachedResult,
      });
    }

    let whereCondition = { status: { [Op.in]: ["pending", "reject"] } };
    if (role == "admin") {
    } else if (role == "manager") {
      if (ownOnly == "true") {
        whereCondition = { userId, ...whereCondition };
      }
    } else {
      whereCondition = { userId, ...whereCondition };
    }

    const data = await Order.findAll({
      where: whereCondition,
      attributes: { exclude: ["createdAt", "updatedAt"] },
      include: [
        {
          model: Customer,
          attributes: ["customerName", "companyName"],
        },
        {
          model: Product,
          attributes: ["typeProduct", "productName", "maKhuon"],
        },
        {
          model: Box,
          as: "box",
          attributes: {
            exclude: ["createdAt", "updatedAt"],
          },
        },
        { model: User, attributes: ["fullName"] },
      ],
      order: [["createdAt", "DESC"]],
    });

    await redisCache.set(cacheKey, JSON.stringify(data), "EX", 3600);

    res.status(200).json({
      message: "Get all orders from DB with status: pending and reject",
      data,
    });
  } catch (error) {
    console.error("Error in getOrderPendingAndReject:", error);
    res.status(500).json({ message: error.message });
  }
};

//add order
export const addOrder = async (req, res) => {
  const { userId } = req.user;
  const { prefix = "CUSTOM", customerId, productId, box, ...orderData } = req.body;
  try {
    if (!userId) return res.status(400).json({ message: "Missing userId" });

    const validation = await validateCustomerAndProduct(customerId, productId);
    if (!validation.success) {
      return res.status(400).json({ message: validation.message });
    }

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
    if (newOrder.isBox === true) {
      try {
        await createDataTable(newOrderId, Box, box);
      } catch (error) {
        console.error("Error creating related data:", error);
        return res.status(500).json({ message: "Failed to create related data" });
      }
    }

    //delete redis
    const cacheKey = `orders:${userId}:pending_reject`;
    await redisCache.del(cacheKey);

    // res.status(201).json({ order: newOrder, notification: notificationResult });
    res.status(201).json({ order: newOrder });
  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({ error: error.message });
  }
};

// update order
export const updateOrder = async (req, res) => {
  const { orderId } = req.query;
  const { box, ...orderData } = req.body;
  const { userId } = req.user;

  try {
    if (!userId) {
      return res.status(400).json({ message: "Missing userId" });
    }

    const order = await Order.findOne({ where: { orderId } });
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    await order.update({
      ...orderData,
    });

    if (order.isBox === true) {
      await updateChildOrder(orderId, Box, box);
    } else {
      await Box.destroy({ where: { orderId } });
    }

    // Xóa cache liên quan user này
    const cacheKey = `orders:${userId}:pending_reject`;
    await redisCache.del(cacheKey);

    res.status(200).json({
      message: "Order updated successfully",
      order,
    });
  } catch (error) {
    console.error("update order failed:", error);
    res.status(500).json({
      message: "update order failed",
      error: error.message,
    });
  }
};

// delete order
export const deleteOrder = async (req, res) => {
  const { id } = req.query;
  const { userId } = req.user;

  try {
    if (!userId) {
      return res.status(400).json({ message: "Missing userId" });
    }

    const deletedOrder = await Order.destroy({
      where: { orderId: id },
    });

    if (!deletedOrder) {
      return res.status(404).json({ message: "Order delete failed" });
    }

    // Xóa cache liên quan user này
    const cacheKey = `orders:${userId}:pending_reject`;
    await redisCache.del(cacheKey);

    res.status(200).json({ message: "Order deleted successfully" });
  } catch (error) {
    console.error("Delete order failed:", error);
    res.status(500).json({ error: error.message });
  }
};
