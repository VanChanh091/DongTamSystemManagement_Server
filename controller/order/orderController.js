import Redis from "ioredis";
import Order from "../../models/order/order.js";
import { Op, fn, col, where } from "sequelize";
import Customer from "../../models/customer/customer.js";
import InfoProduction from "../../models/order/infoProduction.js";
import QuantitativePaper from "../../models/order/quantitativePaper.js";
import Box from "../../models/order/box.js";

const redisCache = new Redis();

//get all
export const getAllOrder = async (req, res) => {
  const { customerId } = req.query;

  try {
    //check cache redis
    const cacheKey = "orders:all";
    const cachedData = await redisCache.get(cacheKey);
    if (cachedData) {
      console.log("✅ Dữ liệu từ Redis");
      return res.status(200).json({
        message: "Get all order from cache",
        data: JSON.parse(cachedData),
      });
    }

    //find order
    const orders = await Order.findAll({
      include: [
        {
          model: Customer,
          attributes: ["customerName", "companyName"],
        },
        { model: InfoProduction, as: "infoProduction" },
        // { model: QuantitativePaper, as: "quantitativePaper" },
        { model: Box, as: "box" },
      ],
      order: [["createdAt", "DESC"]],
    });

    // save redis cache in 2h
    await redisCache.set(cacheKey, JSON.stringify(orders), "EX", 7200);
    res.status(201).json({ message: "get all orders successfully", orders });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//get by id
export const getOrderById = async (req, res) => {
  const { id } = req.params;
  try {
    const orders = await Order.findAll({
      where: where(fn("LOWER", col("Order.orderId")), {
        [Op.like]: `%${id.toLowerCase()}%`,
      }),
      include: [
        { model: Customer, attributes: ["customerName", "companyName"] },
        { model: InfoProduction, as: "infoProduction" },
        { model: QuantitativePaper, as: "quantitativePaper" },
        { model: Box, as: "box" },
      ],
    });

    if (!orders) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json({ orders });
  } catch (err) {
    res.status(500).json({
      message: "Failed to get order",
      error: err.message,
    });
  }
};

//add order
export const addOrder = async (req, res) => {
  const {
    prefix = "CUSTOM",
    customerId,
    infoProduction,
    quantitativePaper,
    box,
    ...orderData
  } = req.body;
  try {
    //check customerId exist
    const customer = await Customer.findOne({
      where: { customerId: customerId },
    });
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // Tạo orderId tự động theo prefix
    const lastOrderId = await Order.findOne({
      where: {
        orderId: {
          [Op.like]: `${prefix}%`,
        },
      },
      order: [["orderId", "DESC"]],
    });
    let newNumber = 1;
    if (lastOrderId && lastOrderId.orderId) {
      const lastNumber = parseInt(lastOrderId.orderId.slice(prefix.length), 10);
      if (!isNaN(lastNumber)) {
        newNumber = lastNumber + 1;
      }
    }
    const formattedNumber = String(newNumber).padStart(3, "0");
    const newOrderId = `${prefix}${formattedNumber}`;

    //create order
    const newOrder = await Order.create({
      orderId: newOrderId,
      customerId: customerId,

      ...orderData,
    });

    //create table data
    await createDataTable(newOrderId, InfoProduction, infoProduction);
    // await createDataTable(newOrderId, QuantitativePaper, quantitativePaper);
    await createDataTable(newOrderId, Box, box);

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
  }
};

//update order
export const updateOrder = async (req, res) => {
  const { id } = req.params;
  const { infoProduction, quantitativePaper, box, ...orderData } = req.body;
  try {
    const order = await Order.findOne({ where: { orderId: id } });
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    await order.update(orderData);

    await updateChildOrder(id, InfoProduction, infoProduction);
    await updateChildOrder(id, QuantitativePaper, quantitativePaper);
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
  const { id } = req.params;
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
