import Redis from "ioredis";
import Order from "../../../models/order/order.js";
import { Op, fn, col, where } from "sequelize";
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
  getOrdersFromCacheOrDb,
} from "../../../utils/helper/orderHelpers.js";

const redisCache = new Redis();

//===============================ACCEPT AND PLANNING=====================================

//get order status accept and planning
export const getOrderAcceptAndPlanning = async (req, res) => {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    const currentPage = Number(page);
    const currentPageSize = Number(pageSize);

    const cacheKey = `orders:tests:page:${page}:status:accept_planning`;

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
      3600
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
  const { name, page = 1 } = req.query;
  const cacheKey = `orders:tests:page:${page}:status:accept_planning`;

  return getOrdersFromCacheOrDb({
    cacheKey,
    matchFn: (order) =>
      order?.Customer?.customerName?.toLowerCase().includes(name.toLowerCase()),
    dbQueryFn: async () => {
      const customers = await Customer.findAll({
        where: { customerName: { [Op.like]: `%${name.toLowerCase()}%` } },
        attributes: ["customerId", "customerName", "companyName"],
      });

      const customerIds = customers.map((c) => c.customerId);
      return Order.findAll({
        where: { customerId: { [Op.in]: customerIds } },
        include: [
          { model: Customer, attributes: ["customerName", "companyName"] },
          { model: Product },
          { model: Box, as: "box" },
        ],
        order: [["createdAt", "DESC"]],
        offset: (page - 1) * 20,
        limit: 20,
      });
    },
    notFoundMessage: "Không tìm thấy đơn hàng theo khách hàng",
    successCacheMessage: "Get orders by customer name from cache",
    successDbMessage: "Get orders by customer name from DB",
    res,
  });
};

//get by product name
export const getOrderByProductName = async (req, res) => {
  const { name, page = 1 } = req.query;
  const cacheKey = `orders:tests:page:${page}:status:accept_planning`;

  return getOrdersFromCacheOrDb({
    cacheKey,
    matchFn: (order) =>
      order?.Product?.productName?.toLowerCase().includes(name.toLowerCase()),
    dbQueryFn: async () => {
      const products = await Product.findAll({
        where: { productName: { [Op.like]: `%${name.toLowerCase()}%` } },
      });

      const productIds = products.map((p) => p.productId);
      return Order.findAll({
        where: { productId: { [Op.in]: productIds } },
        include: [
          { model: Customer, attributes: ["customerName", "companyName"] },
          { model: Product },
          { model: Box, as: "box" },
        ],
        order: [["createdAt", "DESC"]],
        offset: (page - 1) * 20,
        limit: 20,
      });
    },
    notFoundMessage: "Không tìm thấy đơn hàng theo tên sản phẩm",
    successCacheMessage: "Get orders by product name from cache",
    successDbMessage: "Get orders by product name from DB",
    res,
  });
};

//get by QC box
export const getOrderByQcBox = async (req, res) => {
  const { QcBox, page = 1 } = req.query;
  const cacheKey = `orders:tests:page:${page}:status:accept_planning`;

  return getOrdersFromCacheOrDb({
    cacheKey,
    matchFn: (order) =>
      order?.QC_box?.toLowerCase().includes(QcBox.toLowerCase()),
    dbQueryFn: async () =>
      Order.findAll({
        where: {
          status: "accept_planning",
          [Op.and]: where(fn("LOWER", col("QC_box")), {
            [Op.like]: `%${QcBox.toLowerCase()}%`,
          }),
        },
        include: [
          { model: Customer, attributes: ["customerName", "companyName"] },
          { model: Product },
          { model: Box, as: "box" },
        ],
        order: [["createdAt", "DESC"]],
        offset: (page - 1) * 20,
        limit: 20,
      }),
    notFoundMessage: "Không tìm thấy đơn hàng theo QC_box",
    successCacheMessage: "Get orders by QC_box from cache",
    successDbMessage: "Get orders by QC_box from DB",
    res,
  });
};

//get by price
export const getOrderByPrice = async (req, res) => {
  const { price, page = 1 } = req.query;
  const targetPrice = parseFloat(price);
  const cacheKey = `orders:tests:page:${page}:status:accept_planning`;

  return getOrdersFromCacheOrDb({
    cacheKey,
    matchFn: (order) => Number(order?.price) === targetPrice,
    dbQueryFn: async () =>
      Order.findAll({
        where: { price: { [Op.eq]: targetPrice } },
        include: [
          { model: Customer, attributes: ["customerName", "companyName"] },
          { model: Product },
          { model: Box, as: "box" },
        ],
        order: [["createdAt", "DESC"]],
        offset: (page - 1) * 20,
        limit: 20,
      }),
    notFoundMessage: "Không tìm thấy đơn hàng theo giá",
    successCacheMessage: "Get orders by price from cache",
    successDbMessage: "Get orders by price from DB",
    res,
  });
};

//===============================PENDING AND REJECT=====================================

//get order pending and reject
export const getOrderPendingAndReject = async (req, res) => {
  try {
    // const { userId } = req.query;
    //  if (!userId) {
    //   return res.status(400).json({ message: "Missing userId" });
    // }

    const cacheKey = `orders:tests:status:pending_reject`;

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
    quantitativePaper,
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
    try {
      await createDataTable(newOrderId, Box, box);
    } catch (error) {
      console.error("Error creating related data:", error);
      return res.status(500).json({ message: "Failed to create related data" });
    }

    //delete redis
    const cacheKey = `orders:tests:status:pending_reject`;
    await redisCache.del(cacheKey);

    const notificationResult = await sendNotification({
      title: "Đơn hàng mới",
      message: `Đơn hàng ${newOrderId} đã được tạo.`,
      targetUserId: "admin",
      data: {
        orderId: newOrderId,
        customerId,
        productId,
      },
    });

    res.status(201).json({ order: newOrder, notification: notificationResult });
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
  const { quantitativePaper, box, ...orderData } = req.body;
  try {
    // if (!userId) return res.status(400).json({ message: "Missing userId" });

    const order = await Order.findOne({ where: { orderId: id } });
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.status == "accept") {
      return res
        .status(400)
        .json({ message: "Không thể cập nhật đơn hàng đã được duyệt" });
    }

    await order.update({
      status: "pending",
      ...orderData,
    });

    await updateChildOrder(id, Box, box);

    const cacheKey = `orders:tests:status:pending_reject`;
    await redisCache.del(cacheKey);

    res.status(201).json({
      message: "Order updated successfully",
      order,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
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

    const cacheKey = `orders:tests:status:pending_reject`;
    await redisCache.del(cacheKey);

    res.status(201).json({ message: "Order deleted successfully" });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};
