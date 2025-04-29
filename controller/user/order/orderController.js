import Redis from "ioredis";
import Order from "../../../models/order/order.js";
import { Op, fn, col, where } from "sequelize";
import Customer from "../../../models/customer/customer.js";
import Box from "../../../models/order/box.js";
import Product from "../../../models/product/product.js";

const redisCache = new Redis();

//get all
export const getAllOrder = async (req, res) => {
  try {
    // Kiểm tra cache Redis
    const cacheKey = "orders:all";
    const cachedData = await redisCache.get(cacheKey);
    if (cachedData) {
      console.log("✅ Data Order from Redis");
      return res.status(200).json({
        message: "Get all orders from cache",
        orders: JSON.parse(cachedData),
      });
    }

    const orders = await Order.findAll({
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

    // Cache redis in 1 hour
    await redisCache.set(cacheKey, JSON.stringify(orders), "EX", 3600);

    return res
      .status(201)
      .json({ message: "Get all orders successfully", orders });
  } catch (error) {
    console.error("❌ Lỗi:", error);
    return res.status(500).json({ message: error.message });
  }
};

const cacheRedis = async (colData, params) => {
  const cacheKey = "orders:all";
  const cachedData = await redisCache.get(cacheKey);

  if (cachedData) {
    const parsedData = JSON.parse(cachedData);

    const product = parsedData.filter((item) =>
      item[colData]?.toLowerCase().includes(params.toLowerCase())
    );

    if (product.length > 0) {
      return product;
    }
  }

  return null;
};

//get by customer name
export const getOrderByCustomerName = async (req, res) => {
  const { name } = req.query;

  try {
    //check cache redis
    const cacheKey = "orders:all";
    const cachedData = await redisCache.get(cacheKey);

    if (cachedData) {
      console.log("✅ Get Orders from Redis");
      const parsedOrders = JSON.parse(cachedData);

      const matchedOrders = parsedOrders.filter((order) =>
        order?.Customer?.customerName
          ?.toLowerCase()
          .includes(name.toLowerCase())
      );

      if (!matchedOrders || matchedOrders.length === 0) {
        return res.status(404).json({
          message: "Không tìm thấy đơn hàng theo khách hàng trong cache",
        });
      }
      return res.status(200).json({
        message: "Get orders by customer name from cache",
        orders: matchedOrders,
      });
    }

    //  Nếu không có cache → truy vấn từ DB
    const customers = await Customer.findAll({
      where: { customerName: { [Op.like]: `%${name.toLowerCase()}%` } },
      attributes: ["customerId", "customerName", "companyName"],
    });

    if (!customers) {
      return res.status(404).json({ message: "Không tìm thấy khách hàng" });
    }

    const customerIds = customers.map((customer) => customer.customerId);

    const orders = await Order.findAll({
      where: { customerId: { [Op.in]: customerIds } },
      include: [
        {
          model: Customer,
          attributes: ["customerName", "companyName"],
        },
        {
          model: Product,
        },
        { model: Box, as: "box" },
      ],
      order: [["createdAt", "DESC"]],
    });

    if (!orders) {
      return res.status(404).json({ message: "Orders not found" });
    }

    return res.status(200).json({
      message: "Get orders by customer name from DB",
      orders: orders,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to get customers by name",
      error: error.message,
    });
  }
};

//get by type product
export const getOrderByTypeProduct = async (req, res) => {
  const { type } = req.query;
  try {
    //check cache redis
    const cacheKey = "orders:all";
    const cachedData = await redisCache.get(cacheKey);

    if (cachedData) {
      console.log("✅ Get Orders from Redis");
      const parsedOrders = JSON.parse(cachedData);

      const matchedOrders = parsedOrders.filter((order) =>
        order?.Product?.typeProduct?.toLowerCase().includes(type.toLowerCase())
      );

      if (!matchedOrders || matchedOrders.length === 0) {
        return res.status(404).json({
          message: "Không tìm thấy đơn hàng theo loại sản phẩm trong cache",
        });
      }
      return res.status(200).json({
        message: "Get orders by type product from cache",
        orders: matchedOrders,
      });
    }

    //  Nếu không có cache → truy vấn từ DB
    const product = await Product.findAll({
      where: { typeProduct: { [Op.like]: `%${type.toLowerCase()}%` } },
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    const productIds = product.map((product) => product.productId);

    const orders = await Order.findAll({
      where: { productId: { [Op.in]: productIds } },
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

    if (!orders) {
      return res.status(404).json({ message: "Customer not found" });
    }

    return res
      .status(201)
      .json({ message: "Get orders by type product from DB", orders: orders });
  } catch (error) {
    res.status(500).json({
      message: "Failed to get customers by name",
      error: error.message,
    });
  }
};

//get by product name
export const getOrderByProductName = async (req, res) => {
  const { name } = req.query;
  try {
    //check cache redis
    const cacheKey = "orders:all";
    const cachedData = await redisCache.get(cacheKey);

    if (cachedData) {
      console.log("✅ Get Orders from Redis");
      const parsedOrders = JSON.parse(cachedData);

      const matchedOrders = parsedOrders.filter((order) =>
        order?.Product?.productName?.toLowerCase().includes(name.toLowerCase())
      );

      if (!matchedOrders || matchedOrders.length === 0) {
        return res.status(404).json({
          message: "Không tìm thấy đơn hàng theo tên sản phẩm trong cache",
        });
      }
      return res.status(200).json({
        message: "Get orders by product name from cache",
        orders: matchedOrders,
      });
    }

    //  Nếu không có cache → truy vấn từ DB
    const product = await Product.findAll({
      where: { productName: { [Op.like]: `%${name.toLowerCase()}%` } },
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    const productIds = product.map((product) => product.productId);

    const orders = await Order.findAll({
      where: { productId: { [Op.in]: productIds } },
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

    if (!orders) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.status(200).json({
      message: "Get orders by product name from DB",
      orders: orders,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to get customers by name",
      error: error.message,
    });
  }
};

//get by QC box
export const getOrderByQcBox = async (req, res) => {
  const { QcBox } = req.query;
  try {
    const cachedResult = await cacheRedis("QC_box", QcBox);

    if (cachedResult) {
      console.log("✅ Get Order from cache");
      return res.status(200).json({
        message: "Get Order from cache",
        orders: cachedResult,
      });
    }

    // Nếu không có cache thì lấy từ DB
    const orders = await Order.findAll({
      where: where(fn("LOWER", col("QC_box")), {
        [Op.like]: `%${QcBox.toLowerCase()}%`,
      }),
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

    if (!orders || orders.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json({
      message: "Get Order from DB",
      orders: orders,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to get Order by QC_Box",
      error: error.message,
    });
  }
};

//get by price
export const getOrderByPrice = async (req, res) => {
  const { price } = req.query;

  try {
    const cacheKey = "orders:all";
    const cachedData = await redisCache.get(cacheKey);

    const targetPrice = parseFloat(price);

    if (cachedData) {
      console.log("✅ Get Order from cache");

      const parsedData = JSON.parse(cachedData);

      const matchedOrders = parsedData.filter(
        (item) => Number(item?.price) === targetPrice
      );

      if (matchedOrders.length === 0) {
        return res.status(404).json({ message: "Order not found in cache" });
      }

      return res.status(200).json({
        message: "Get Order from cache",
        orders: matchedOrders,
      });
    }

    // Nếu không có cache thì lấy từ DB
    const orders = await Order.findAll({
      where: {
        price: {
          [Op.eq]: targetPrice,
        },
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

    if (!orders || orders.length === 0) {
      return res.status(404).json({ message: "Order not found in DB" });
    }

    res.status(200).json({
      message: "Get Order from DB",
      orders: orders,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to get Order by price",
      error: error.message,
    });
  }
};

//add order
export const addOrder = async (req, res) => {
  const {
    prefix = "CUSTOM",
    customerId,
    productId,
    quantitativePaper,
    box,
    ...orderData
  } = req.body;
  try {
    const sanitizedPrefix = prefix.trim().replace(/\s+/g, "");

    //check customerId exist
    const customer = await Customer.findOne({
      where: { customerId: customerId },
    });
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    //check productId exist
    const product = await Product.findOne({
      where: { productId: productId },
    });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Tạo orderId tự động theo prefix
    const lastOrderId = await Order.findOne({
      where: {
        orderId: {
          [Op.startsWith]: `${sanitizedPrefix}%`,
        },
      },
      order: [["orderId", "DESC"]],
    });

    let newNumber = 1;
    if (lastOrderId && lastOrderId.orderId) {
      const lastNumber = parseInt(
        lastOrderId.orderId.slice(sanitizedPrefix.length),
        10
      );
      if (!isNaN(lastNumber)) {
        newNumber = lastNumber + 1;
      }
    }
    const formattedNumber = String(newNumber).padStart(3, "0");
    const newOrderId = `${sanitizedPrefix}${formattedNumber}`;

    //create order
    const newOrder = await Order.create({
      orderId: newOrderId,
      customerId: customerId,
      productId: productId,
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
    await redisCache.del("orders:all");

    res.status(201).json(newOrder);
  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({ error: error.message });
  }
};

const createDataTable = async (id, model, data) => {
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

//update order
export const updateOrder = async (req, res) => {
  const { id } = req.query;
  const { quantitativePaper, box, ...orderData } = req.body;
  try {
    const order = await Order.findOne({ where: { orderId: id } });
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    await order.update(orderData);

    await updateChildOrder(id, Box, box);

    await redisCache.del("orders:all");

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

const updateChildOrder = async (id, model, data) => {
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

//delete order
export const deleteOrder = async (req, res) => {
  const { id } = req.query;
  try {
    const deleteOrder = await Order.destroy({
      where: { orderId: id },
    });

    if (!deleteOrder) {
      return res.status(404).json({ message: "Order deleted failed" });
    }

    await redisCache.del("orders:all");

    res.status(201).json({ message: "Order deleted successfully" });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};
