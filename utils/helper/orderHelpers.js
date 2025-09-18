import { Op } from "sequelize";
import Customer from "../../models/customer/customer.js";
import Product from "../../models/product/product.js";
import Order from "../../models/order/order.js";
import Box from "../../models/order/box.js";
import Redis from "ioredis";

const redisCache = new Redis();

export const validateCustomerAndProduct = async (customerId, productId) => {
  const customer = await Customer.findOne({ where: { customerId } });
  if (!customer) {
    return { success: false, message: "Customer not found" };
  }

  const product = await Product.findOne({ where: { productId } });
  if (!product) {
    return { success: false, message: "Product not found" };
  }

  return { success: true };
};

export const generateOrderId = async (prefix) => {
  const sanitizedPrefix = prefix.trim().replace(/\s+/g, "");

  const lastOrder = await Order.findOne({
    where: { orderId: { [Op.like]: `${sanitizedPrefix}%` } },
    order: [["orderId", "DESC"]],
  });

  let number = 1;
  if (lastOrder && lastOrder.orderId) {
    const lastNumber = parseInt(lastOrder.orderId.slice(sanitizedPrefix.length), 10);
    if (!isNaN(lastNumber)) {
      number = lastNumber + 1;
    }
  }

  const formattedNumber = number.toString().padStart(3, "0");
  return `${sanitizedPrefix}${formattedNumber}`;
};

export const createDataTable = async (id, model, data) => {
  try {
    if (data) {
      await model.create({ orderId: id, ...data });
    }
  } catch (error) {
    console.error(`Create table ${model} error:`, error);
    throw error;
  }
};

export const updateChildOrder = async (id, model, data) => {
  try {
    if (data) {
      const existingData = await model.findOne({ where: { orderId: id } });
      if (existingData) {
        await model.update(data, { where: { orderId: id } });
      } else {
        await model.create({ orderId: id, ...data });
      }
    }
  } catch (error) {
    console.error(`Create table ${model} error:`, error);
  }
};

export const cachedStatus = async (parsed, prop1, prop2, userId, role) => {
  // Nếu redis lưu thẳng mảng thì parsed là array
  // Nếu redis lưu object {data: [...]}, thì lấy parsed.data
  const ordersArray = Array.isArray(parsed) ? parsed : parsed?.data;

  if (!Array.isArray(ordersArray)) {
    return null;
  }

  let data;
  if (role === "admin" || role === "manager") {
    data = ordersArray.filter((order) => [prop1, prop2].includes(order.status));
  } else {
    data = ordersArray.filter(
      (order) => [prop1, prop2].includes(order.status) && order.userId === userId
    );
  }

  return data.length > 0 ? data : null;
};

export const filterOrdersFromCache = async ({
  userId,
  role,
  keyword,
  getFieldValue,
  page,
  pageSize,
  cacheKeyPrefix = "orders:default",
  message,
}) => {
  const currentPage = Number(page);
  const currentPageSize = Number(pageSize);
  const lowerKeyword = keyword?.toLowerCase?.() || "";

  // Dùng prefix để tạo key cache
  const keyRole = role === "admin" || role === "manager" ? "all" : `userId:${userId}`;
  const allDataCacheKey = `${cacheKeyPrefix}:${keyRole}`; //orders:accept_planning:all

  // Lấy cache
  let allOrders = await redisCache.get(allDataCacheKey);
  let sourceMessage = "";

  if (!allOrders) {
    const whereCondition = { status: { [Op.in]: ["accept", "planning"] } };

    if (role !== "admin" && role !== "manager") {
      whereCondition.userId = userId;
    }

    allOrders = await Order.findAll({
      where: whereCondition,
      include: [
        { model: Customer, attributes: ["customerName", "companyName"] },
        {
          model: Product,
          attributes: ["typeProduct", "productName", "maKhuon"],
        },
        {
          model: Box,
          as: "box",
          attributes: {
            exclude: ["boxId", "createdAt", "updatedAt", "orderId"],
          },
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    await redisCache.set(allDataCacheKey, JSON.stringify(allOrders), "EX", 900);
    sourceMessage = "Get all orders from DB";
  } else {
    allOrders = JSON.parse(allOrders);
    sourceMessage = message;
  }

  // Lọc
  const filteredOrders = allOrders.filter((order) =>
    getFieldValue(order)?.toLowerCase?.().includes(lowerKeyword)
  );

  const totalOrders = filteredOrders.length;
  const totalPages = Math.ceil(totalOrders / currentPageSize);
  const offset = (currentPage - 1) * currentPageSize;
  const paginatedOrders = filteredOrders.slice(offset, offset + currentPageSize);

  return {
    message: sourceMessage,
    data: paginatedOrders,
    totalOrders,
    totalPages,
    currentPage,
  };
};

export const filterCustomersFromCache = async ({
  keyword,
  getFieldValue,
  page,
  pageSize,
  message,
}) => {
  const currentPage = Number(page);
  const currentPageSize = Number(pageSize);
  const lowerKeyword = keyword?.toLowerCase?.() || "";

  const cacheKey = "customers:search:all";

  try {
    let allCustomers = await redisCache.get(cacheKey);
    let sourceMessage = "";

    if (!allCustomers) {
      allCustomers = await Customer.findAll({
        attributes: { exclude: ["createdAt", "updatedAt"] },
      });
      await redisCache.set(cacheKey, JSON.stringify(allCustomers), "EX", 900);
      sourceMessage = "Get customers from DB";
    } else {
      allCustomers = JSON.parse(allCustomers);
      sourceMessage = message;
    }

    const filteredCustomers = allCustomers.filter((customer) =>
      getFieldValue(customer)?.toLowerCase?.().includes(lowerKeyword)
    );

    const totalCustomers = filteredCustomers.length;
    const totalPages = Math.ceil(totalCustomers / currentPageSize);
    const offset = (currentPage - 1) * currentPageSize;
    const paginatedCustomers = filteredCustomers.slice(offset, offset + currentPageSize);

    return {
      message: sourceMessage,
      data: paginatedCustomers,
      totalCustomers,
      totalPages,
      currentPage,
    };
  } catch (error) {
    console.error("get all customer failed:", error);
    res.status(500).json({ message: "get all customers failed", error });
  }
};
