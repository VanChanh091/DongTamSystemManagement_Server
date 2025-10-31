import { Op } from "sequelize";
import Redis from "ioredis";
import Customer from "../../../models/customer/customer.js";
import Product from "../../../models/product/product.js";
import Order from "../../../models/order/order.js";
import Box from "../../../models/order/box.js";

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
  const filteredOrders = allOrders.filter((order) => {
    const fieldValue = getFieldValue(order);
    if (fieldValue == null) return false;
    return String(fieldValue).toLowerCase().includes(lowerKeyword);
  });

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

export const filterDataFromCache = async ({
  model,
  cacheKey,
  keyword,
  getFieldValue,
  page,
  pageSize,
  message,
  totalKey,
  fetchFunction,
}) => {
  const currentPage = Number(page) || 1;
  const currentPageSize = Number(pageSize) || 20;
  const lowerKeyword = keyword?.toLowerCase?.() || "";

  try {
    let allData = await redisCache.get(cacheKey);
    let sourceMessage = "";

    if (!allData) {
      allData = fetchFunction ? await fetchFunction() : await model.findAll();
      await redisCache.set(cacheKey, JSON.stringify(allData), "EX", 900);
      sourceMessage = `Get ${cacheKey} from DB`;
    } else {
      allData = JSON.parse(allData);
      sourceMessage = message || `Get ${cacheKey} from cache`;
    }

    // Lọc dữ liệu
    const filteredData = allData.filter((item) => {
      const fieldValue = getFieldValue(item);
      return fieldValue != null ? String(fieldValue).toLowerCase().includes(lowerKeyword) : false;
    });

    // Phân trang
    const totalItems = filteredData.length;
    const totalPages = Math.ceil(totalItems / currentPageSize);
    const offset = (currentPage - 1) * currentPageSize;
    const paginatedData = filteredData.slice(offset, offset + currentPageSize);

    return {
      message: sourceMessage,
      data: paginatedData,
      [totalKey]: totalItems,
      totalPages,
      currentPage,
    };
  } catch (error) {
    console.error(error);
    throw new Error("Lỗi server");
  }
};

export function formatterStructureOrder(cell) {
  const parts = [
    cell.dayReplace || cell.day,
    cell.songEReplace || cell.songE,
    cell.matEReplace || cell.matE,
    cell.songBReplace || cell.songB,
    cell.matBReplace || cell.matB,
    cell.songCReplace || cell.songC,
    cell.matCReplace || cell.matC,
    cell.songE2Replace || cell.songE2,
  ];

  const formattedParts = [];
  for (const part of parts) {
    if (part && String(part).trim() !== "") {
      formattedParts.push(part);
    }
  }

  return formattedParts.join("/");
}
