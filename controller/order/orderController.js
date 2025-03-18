import Redis from "ioredis";
import Order from "../../models/order/order.js";
import { Op, fn, col, where } from "sequelize";
import Customer from "../../models/customer/customer.js";
import InfoProduction from "../../models/order/infoProduction.js";
import QuantitativePaper from "../../models/order/quantitativePaper.js";
import Box from "../../models/order/box.js";
import { receiveMessageOnPort } from "worker_threads";

const redisCache = new Redis();

//get all
export const getAllOrder = async (req, res) => {
  try {
    const cacheKey = "orders:all";
    const cachedData = await redisCache.get(cacheKey);
    if (cachedData) {
      console.log("✅ Dữ liệu từ Redis");
      return res.status(200).json({
        message: "Get all order from cache",
        data: JSON.parse(cachedData),
      });
    }

    const orders = await Order.findAll({
      include: [
        {
          model: Customer,
          attributes: ["customerId", "customerName"],
        },
        { model: InfoProduction },
        { model: QuantitativePaper },
        { model: Box },
      ],
    });

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
    const order = await Order.findAll({
      where: where(fn("LOWER", col("orderId")), {
        [Op.like]: `%${id.toLowerCase()}%`,
      }),
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json({ order });
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
    customerId,
    prefix = "CUSTOM",
    infoProduction,
    quantitativePaper,
    box,
    ...orderData
  } = req.body;
  try {
    //check customerId
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
      customerName: customer.customerName,
      companyName: customer.companyName,
      ...orderData,
    });

    //create info production
    if (infoProduction) {
      await InfoProduction.create({
        orderId: newOrderId,
        ...infoProduction,
      });
    }

    //create quantitative paper
    if (quantitativePaper) {
      await QuantitativePaper.create({
        orderId: newOrderId,
        ...quantitativePaper,
      });
    }

    //create box
    if (box) {
      await Box.create({
        orderId: newOrderId,
        ...box,
      });
    }

    //delete redis
    await redisCache.del("orders:all");

    res.status(201).json(newOrder);
  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({ error: error.message });
  }
};

//update order
export const updateOrder = async (req, res) => {
  const { id } = req.params;
  const { ...orderData } = req.body;
  try {
    const order = await Order.findOne({ where: { orderId: id } });
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    await order.update(orderData);

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

//delete order
export const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
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
