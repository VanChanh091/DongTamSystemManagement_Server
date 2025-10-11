import Redis from "ioredis";
import Order from "../../models/order/order.js";
import Customer from "../../models/customer/customer.js";
import Product from "../../models/product/product.js";
import Box from "../../models/order/box.js";
import User from "../../models/user/user.js";
import { Sequelize } from "sequelize";

const redisCache = new Redis();

//getOrderPending
export const getOrderPending = async (req, res) => {
  try {
    const data = await Order.findAll({
      where: { status: "pending" },
      attributes: { exclude: ["createdAt", "updatedAt"] },
      include: [
        { model: Customer, attributes: ["customerName", "companyName"] },
        {
          model: Product,
          attributes: ["typeProduct", "productName", "maKhuon", "productImage"],
        },
        { model: Box, as: "box" },
        { model: User, attributes: ["fullName"] },
      ],
      order: [
        //lấy 3 số đầu tiên -> ép chuỗi thành số để so sánh -> sort
        [
          Sequelize.literal(`CAST(SUBSTRING_INDEX(\`Order\`.\`orderId\`, '/', 1) AS UNSIGNED)`),
          "ASC",
        ],
        [Sequelize.col("Order.createdAt"), "ASC"], // nếu trùng thì sort theo ngày tạo (tạo trước lên trên)
      ],
    });
    res.json({ message: "get all order have status:pending", data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

//accept or reject order
export const updateStatusAdmin = async (req, res) => {
  const { id } = req.query;
  const { newStatus, rejectReason } = req.body;

  try {
    const acceptCacheKey = "orders:userId:status:accept";

    if (!["accept", "reject"].includes(newStatus)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    // const order = await Order.findByPk(id);
    const order = await Order.findOne({
      where: { orderId: id },
      attributes: [
        "orderId",
        "totalPrice",
        "status",
        "rejectReason",
        "customerId",
        "productId",
        "userId",
      ],
      include: [
        {
          model: Customer,
          attributes: ["customerId", "debtCurrent", "debtLimit"],
        },
        {
          model: Product,
          attributes: ["productId", "typeProduct"],
        },
        { model: Box, as: "box" },
        { model: User, attributes: ["fullName"] },
      ],
    });
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // const customer = order.Customer;
    // const newDebt = Number(customer.debtCurrent || 0) + Number(order.totalPrice || 0);

    if (newStatus === "reject") {
      order.set({ status: newStatus, rejectReason: rejectReason || "" });
    } else {
      //calculate debt limit of customer
      // if (newDebt > customer.debtLimit) {
      //   return res.status(400).json({ message: "Debt limit exceeded" });
      // }
      // await customer.update({ debtCurrent: newDebt });

      //check type product
      order.set({
        status: order.Product.typeProduct == "Phí Khác" ? "planning" : newStatus,
        rejectReason: null,
      });
    }

    await order.save();

    if (newStatus === "accept") {
      await redisCache.del(acceptCacheKey);
    }

    res.json({ message: "Order status updated successfully", order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
