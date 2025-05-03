import Redis from "ioredis";
import Order from "../../models/order/order.js";
import Customer from "../../models/customer/customer.js";
import Product from "../../models/product/product.js";
import Box from "../../models/order/box.js";

const redisCache = new Redis();

//getOrderPending
export const getOrderPending = async (req, res) => {
  try {
    const data = await Order.findAll({
      where: { status: "pending" },
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
    res.json({ message: "get all order have status:pending", data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

//update status
export const updateStatusAdmin = async (req, res) => {
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
