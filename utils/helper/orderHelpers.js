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
    where: {
      orderId: {
        [Op.like]: `${sanitizedPrefix}%`,
      },
    },
    order: [["orderId", "DESC"]],
  });

  let number = 1;
  if (lastOrder && lastOrder.orderId) {
    const lastNumber = parseInt(
      lastOrder.orderId.slice(sanitizedPrefix.length),
      10
    );
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
      await model.create({
        orderId: id,
        ...data,
      });
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

export const cachedStatus = async (cachedName, redisCache, prop1, prop2) => {
  const cachedKey = cachedName;
  const cachedData = await redisCache.get(cachedKey);

  if (!cachedData) {
    return null;
  }

  let parsed;
  try {
    parsed = JSON.parse(cachedData);
  } catch (error) {
    console.error("Error parsing cached data:", error);
    return null;
  }

  // Kiểm tra nếu dữ liệu là object có `data` (kiểu mới)
  const ordersArray = Array.isArray(parsed) ? parsed : parsed?.data;

  if (!Array.isArray(ordersArray)) {
    return null;
  }

  const data = ordersArray.filter((order) =>
    [prop1, prop2].includes(order.status)
  );

  return data.length > 0 ? data : null;
};

export const filterOrdersFromCache = async ({
  keyword,
  getFieldValue,
  page,
  pageSize,
  message,
}) => {
  const currentPage = Number(page);
  const currentPageSize = Number(pageSize);
  const lowerKeyword = keyword?.toLowerCase?.() || "";

  const allDataCacheKey = `orders:tests:status:accept_planning:all`;

  // Lấy cache
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

    await redisCache.set(allDataCacheKey, JSON.stringify(allOrders), "EX", 900);
  } else {
    allOrders = JSON.parse(allOrders);
  }

  // Lọc
  const filteredOrders = allOrders.filter((order) =>
    getFieldValue(order)?.toLowerCase?.().includes(lowerKeyword)
  );

  const totalOrders = filteredOrders.length;
  const totalPages = Math.ceil(totalOrders / currentPageSize);
  const offset = (currentPage - 1) * currentPageSize;
  const paginatedOrders = filteredOrders.slice(
    offset,
    offset + currentPageSize
  );

  return {
    message,
    data: paginatedOrders,
    totalOrders,
    totalPages,
    currentPage,
  };
};
