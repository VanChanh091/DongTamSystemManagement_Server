import Redis from "ioredis";
import Order from "../../../models/order/order.js";
import Customer from "../../../models/customer/customer.js";
import Product from "../../../models/product/product.js";
import Box from "../../../models/order/box.js";
import PaperConsumptionNorm from "../../../models/planning/paperConsumptionNorm.js";
import PLanning from "../../../models/planning/planning.js";

const redisCache = new Redis();

//getOrderAccept
export const getOrderAccept = async (req, res) => {
  try {
    const cacheKey = "orders:userId:status:accept";

    const cachedData = await redisCache.get(cacheKey);
    if (cachedData) {
      return res.json({
        message: "get all order have status:accept from cache",
        data: JSON.parse(cachedData),
      });
    }

    const data = await Order.findAll({
      where: { status: "accept" },
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

    res.json({ message: "get all order have status:accept", data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const planningOrder = async (req, res) => {
  const { orderId, newStatus } = req.query;
  const { paperConsumptionNorm, ...planningData } = req.body;
  try {
    const order = await Order.findOne({
      where: { orderId: orderId },
      include: [
        {
          model: Customer,
          attributes: ["customerName", "companyName"],
        },
        { model: Product },
        { model: Box, as: "box" },
      ],
    });
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const planning = await PLanning.create({
      orderId: orderId,
      ...planningData,
    });

    try {
      await createDataTable(
        planning.planningId,
        PaperConsumptionNorm,
        paperConsumptionNorm
      );
    } catch (error) {
      console.error("Error creating related data:", error);
      return res.status(500).json({ message: "Failed to create related data" });
    }

    order.status = newStatus;
    await order.save();

    await redisCache.del("orders:userId:status:accept");

    res.status(201).json({
      message: "Order status updated successfully",
      planning,
    });
  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({ error: error.message });
  }
};

export const createDataTable = async (id, model, data) => {
  try {
    if (data) {
      await model.create({
        planningId: id,
        ...data,
      });
    }
  } catch (error) {
    console.error(`Create table ${model} error:`, error);
    throw error;
  }
};

//update status
export const updateStatusPlanning = async (req, res) => {
  const { id, newStatus } = req.query;
  try {
    if (!["pending", "accept", "reject", "planning"].includes(newStatus)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const order = await Order.findByPk(id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    order.status = newStatus;
    await order.save();

    await redisCache.set(`order:${id}`, JSON.stringify(order), "EX", 3600);

    res.json({ message: "Order status updated successfully", order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
