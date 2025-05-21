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

// Hàm hỗ trợ: quét và xóa các key theo pattern bằng SCAN
const deleteKeysByPattern = async (redisClient, pattern) => {
  let cursor = "0";

  do {
    const [nextCursor, keys] = await redisClient.scan(
      cursor,
      "MATCH",
      pattern,
      "COUNT",
      100
    );
    cursor = nextCursor;

    if (keys.length > 0) {
      const pipeline = redisClient.pipeline();
      keys.forEach((key) => pipeline.del(key));
      await pipeline.exec();
    }
  } while (cursor !== "0");
};

//update status
export const updateStatusAdmin = async (req, res) => {
  const { id } = req.query;
  const { newStatus, rejectReason } = req.body;

  try {
    const pending_RejectCacheKey = `orders:tests:status:pending_reject`;
    const acceptPlanningCachePattern = `orders:tests:status:accept_planning:*`;

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
    await redisCache.del(pending_RejectCacheKey);

    if (newStatus === "accept") {
      await deleteKeysByPattern(redisCache, acceptPlanningCachePattern);
    }

    res.json({ message: "Order status updated successfully", order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
