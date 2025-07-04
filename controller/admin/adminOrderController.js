import Redis from "ioredis";
import Order from "../../models/order/order.js";
import Customer from "../../models/customer/customer.js";
import Product from "../../models/product/product.js";
import Box from "../../models/order/box.js";
import { deleteKeysByPattern } from "../../utils/helper/adminHelper.js";

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
  const { id } = req.query;
  const { newStatus, rejectReason } = req.body;

  try {
    const pendingRejectCacheKey = `orders:userId:status:pending_reject`;
    const acceptPlanningCachePattern = `orders:userId:status:accept_planning:*`;
    const acceptCacheKey = "orders:userId:status:accept";

    if (!["accept", "reject"].includes(newStatus)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const order = await Order.findByPk(id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    order.status = newStatus;

    if (newStatus === "reject") {
      order.rejectReason = rejectReason || "";
    } else {
      order.rejectReason = null;
    }

    await order.save();

    // Xóa cache theo logic
    await redisCache.del(pendingRejectCacheKey);

    if (newStatus === "accept") {
      await deleteKeysByPattern(redisCache, acceptPlanningCachePattern);
      await redisCache.del(acceptCacheKey);
    }

    res.json({ message: "Order status updated successfully", order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
