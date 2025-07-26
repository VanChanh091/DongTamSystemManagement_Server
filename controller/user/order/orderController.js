import Redis from "ioredis";
import Order from "../../../models/order/order.js";
import { Op } from "sequelize";
import Customer from "../../../models/customer/customer.js";
import Box from "../../../models/order/box.js";
import Product from "../../../models/product/product.js";
import { sendNotification } from "../../../utils/notification.js";
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
  try {
    const { page, pageSize, refresh = false } = req.query;
    const currentPage = Number(page);
    const currentPageSize = Number(pageSize);

    const cacheKey = `orders:userId:status:accept_planning:page:${currentPage}`;

    if (refresh == true) {
      await redisCache.del(cacheKey);
    }

    // Lấy data đã lọc từ cachedStatus
    const cachedData = await redisCache.get(cacheKey);
    if (cachedData) {
      const parsed = JSON.parse(cachedData);
      const filteredData = await cachedStatus(
        cacheKey,
        redisCache,
        "accept",
        "planning"
      );

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

    const offset = (currentPage - 1) * currentPageSize;

    const totalOrders = await Order.count({
      where: { status: { [Op.in]: ["accept", "planning"] } },
    });

    const totalPages = Math.ceil(totalOrders / currentPageSize);

    //find data from db
    const data = await Order.findAll({
      where: { status: { [Op.in]: ["accept", "planning"] } },
      include: [
        {
          model: Customer,
          attributes: ["customerName", "companyName"],
        },
        { model: Product },
        { model: Box, as: "box" },
      ],
      order: [["createdAt", "DESC"]],
      offset,
      limit: currentPageSize,
    });

    s;

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
  const { name, page, pageSize } = req.query;

  const result = await filterOrdersFromCache({
    keyword: name,
    getFieldValue: (order) => order?.Customer?.customerName,
    page,
    pageSize,
    message: "Get orders by customer name from filtered cache",
  });

  return res.status(200).json(result);
};

//get by product name
export const getOrderByProductName = async (req, res) => {
  const { productName, page, pageSize } = req.query;

  const result = await filterOrdersFromCache({
    keyword: productName,
    getFieldValue: (order) => order?.Product?.productName,
    page,
    pageSize,
    message: "Get orders by product name from filtered cache",
  });

  return res.status(200).json(result);
};

//get by QC box
export const getOrderByQcBox = async (req, res) => {
  const { QcBox, page, pageSize } = req.query;

  const result = await filterOrdersFromCache({
    keyword: QcBox,
    getFieldValue: (order) => order?.QC_box,
    page,
    pageSize,
    message: "Get orders by QC box from filtered cache",
  });

  return res.status(200).json(result);
};

//get by price
export const getOrderByPrice = async (req, res) => {
  const { price, page, pageSize } = req.query;
  const currentPage = Number(page);
  const currentPageSize = Number(pageSize);
  const targetPrice = parseFloat(price);

  const allDataCacheKey = `orders:userId:status:accept_planning:all`;

  let allOrders = await redisCache.get(allDataCacheKey);
  if (!allOrders) {
    allOrders = await Order.findAll({
      where: { status: { [Op.in]: ["accept", "planning"] } },
      include: [
        { model: Customer, attributes: ["customerName", "companyName"] },
        { model: Product },
        { model: Box, as: "box" },
      ],
      order: [["createdAt", "DESC"]],
    });

    await redisCache.set(
      allDataCacheKey,
      JSON.stringify(allOrders),
      "EX",
      3600
    );
  } else {
    allOrders = JSON.parse(allOrders);
  }

  // Lọc
  const filteredOrders = allOrders.filter(
    (order) => Number(order?.price) === targetPrice
  );

  const totalOrders = filteredOrders.length;
  const totalPages = Math.ceil(totalOrders / currentPageSize);
  const offset = (currentPage - 1) * currentPageSize;
  const paginatedOrders = filteredOrders.slice(
    offset,
    offset + currentPageSize
  );

  res.status(200).json({
    message: "Get orders by price from filtered cache",
    data: paginatedOrders,
    totalOrders,
    totalPages,
    currentPage,
  });
};

//===============================PENDING AND REJECT=====================================

//get order pending and reject
export const getOrderPendingAndReject = async (req, res) => {
  const { refresh = false } = req.query;
  try {
    // const { userId } = req.query;
    //  if (!userId) {
    //   return res.status(400).json({ message: "Missing userId" });
    // }

    const cacheKey = `orders:userId:status:pending_reject`;

    if (refresh == true) {
      await redisCache.del(cacheKey);
    }

    const cachedResult = await cachedStatus(
      cacheKey,
      redisCache,
      "pending",
      "reject"
      //userId
    );

    if (cachedResult) {
      console.log("✅ Get Order from cache");
      return res.status(200).json({
        message: "Get Order from cache",
        data: cachedResult,
      });
    }

    const data = await Order.findAll({
      where: {
        status: { [Op.in]: ["pending", "reject"] },
        // userId
      },
      include: [
        {
          model: Customer,
          attributes: ["customerName", "companyName"],
        },
        { model: Product },
        { model: Box, as: "box" },
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
  // const { userId } = req.query;
  const {
    prefix = "CUSTOM",
    customerId,
    productId,
    box,
    ...orderData
  } = req.body;
  try {
    //  if (!userId) return res.status(400).json({ message: "Missing userId" });

    const validation = await validateCustomerAndProduct(customerId, productId);
    if (!validation.success) {
      return res.status(500).json({ message: validation.message });
    }

    const newOrderId = await generateOrderId(prefix);

    //create order
    const newOrder = await Order.create({
      orderId: newOrderId,
      customerId: customerId,
      productId: productId,
      // userId,
      ...orderData,
    });

    //create table data
    if (newOrder.isBox === true) {
      try {
        await createDataTable(newOrderId, Box, box);
      } catch (error) {
        console.error("Error creating related data:", error);
        return res
          .status(500)
          .json({ message: "Failed to create related data" });
      }
    }

    //delete redis
    const cacheKey = `orders:userId:status:pending_reject`;
    await redisCache.del(cacheKey);

    // const notificationResult = await sendNotification({
    //   title: "Đơn hàng mới",
    //   message: `Đơn hàng ${newOrderId} đã được tạo.`,
    //   targetUserId: "admin",
    //   data: {
    //     orderId: newOrderId,
    //     customerId,
    //     productId,
    //   },
    // });

    // res.status(201).json({ order: newOrder, notification: notificationResult });
    res.status(201).json({ order: newOrder });
  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({ error: error.message });
  }
};

//update order
export const updateOrder = async (req, res) => {
  const {
    id,
    //userId
  } = req.query;
  const { box, ...orderData } = req.body;
  try {
    // if (!userId) return res.status(400).json({ message: "Missing userId" });

    const order = await Order.findOne({ where: { orderId: id } });
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // if (order.status == "accept") {
    //   return res
    //     .status(400)
    //     .json({ message: "Không thể cập nhật đơn hàng đã được duyệt" });
    // }

    await order.update({
      status: "pending",
      ...orderData,
    });

    await updateChildOrder(id, Box, box);

    const cacheKey = `orders:userId:status:pending_reject`;
    await redisCache.del(cacheKey);

    res.status(201).json({
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

//delete order
export const deleteOrder = async (req, res) => {
  const {
    id,
    //userId
  } = req.query;
  try {
    // if (!userId) return res.status(400).json({ message: "Missing userId" });

    const deleteOrder = await Order.destroy({
      where: { orderId: id },
    });

    if (!deleteOrder) {
      return res.status(404).json({ message: "Order deleted failed" });
    }

    const cacheKey = `orders:userId:status:pending_reject`;
    await redisCache.del(cacheKey);

    res.status(201).json({ message: "Order deleted successfully" });
  } catch (error) {
    console.error("Delete order failed:", error);
    res.status(404).json({ error: error.message });
  }
};
