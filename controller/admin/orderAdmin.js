import Redis from "ioredis";
import Order from "../../models/order/order.js";

const redisCache = new Redis();

//update status
export const updateStatus = async (req, res) => {
  const { id, newStatus } = req.query;
  try {
    if (!["pending", "accept", "reject"].includes(newStatus)) {
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
