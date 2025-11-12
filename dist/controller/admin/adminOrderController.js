"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateStatusAdmin = exports.getOrderPending = void 0;
const order_1 = require("../../models/order/order");
const customer_1 = require("../../models/customer/customer");
const product_1 = require("../../models/product/product");
const box_1 = require("../../models/order/box");
const user_1 = require("../../models/user/user");
const sequelize_1 = require("sequelize");
//getOrderPending
const getOrderPending = async (req, res) => {
    try {
        const data = await order_1.Order.findAll({
            where: { status: "pending" },
            attributes: { exclude: ["createdAt", "updatedAt"] },
            include: [
                { model: customer_1.Customer, attributes: ["customerName", "companyName"] },
                {
                    model: product_1.Product,
                    attributes: ["typeProduct", "productName", "maKhuon", "productImage"],
                },
                { model: box_1.Box, as: "box" },
                { model: user_1.User, attributes: ["fullName"] },
            ],
            order: [
                //lấy 3 số đầu tiên -> ép chuỗi thành số để so sánh -> sort
                [sequelize_1.Sequelize.literal("CAST(SUBSTRING_INDEX(`Order`.`orderId`, '/', 1) AS UNSIGNED)"), "ASC"],
                [sequelize_1.Sequelize.col("Order.createdAt"), "ASC"], // nếu trùng thì sort theo ngày tạo (tạo trước lên trên)
            ],
        });
        res.json({ message: "get all order have status:pending", data });
    }
    catch (error) {
        console.error(error.message);
        res.status(500).json({ message: "Server error" });
    }
};
exports.getOrderPending = getOrderPending;
//accept or reject order
const updateStatusAdmin = async (req, res) => {
    const { id } = req.query;
    const { newStatus, rejectReason } = req.body;
    const orderId = Number(id);
    try {
        if (!["accept", "reject"].includes(newStatus)) {
            return res.status(400).json({ message: "Invalid status" });
        }
        const order = await order_1.Order.findOne({
            where: { orderId: orderId },
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
                    model: customer_1.Customer,
                    attributes: ["customerId", "debtCurrent", "debtLimit"],
                },
                {
                    model: product_1.Product,
                    attributes: ["productId", "typeProduct"],
                },
                { model: box_1.Box, as: "box" },
                { model: user_1.User, attributes: ["fullName"] },
            ],
        });
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        // const customer = order.Customer;
        // const newDebt = Number(customer.debtCurrent || 0) + Number(order.totalPrice || 0);
        if (newStatus === "reject") {
            order.set({ status: newStatus, rejectReason: rejectReason || "" });
        }
        else {
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
        res.json({ message: "Order status updated successfully", order });
    }
    catch (error) {
        console.error(error.message);
        res.status(500).json({ message: "Server error" });
    }
};
exports.updateStatusAdmin = updateStatusAdmin;
//# sourceMappingURL=adminOrderController.js.map