"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteOrderService = exports.updateOrderService = exports.createOrderService = exports.getOrderByStatus = void 0;
const sequelize_1 = require("sequelize");
const box_1 = require("../models/order/box");
const order_1 = require("../models/order/order");
const customer_1 = require("../models/customer/customer");
const product_1 = require("../models/product/product");
const user_1 = require("../models/user/user");
const orderHelpers_1 = require("../utils/helper/modelHelper/orderHelpers");
const appError_1 = require("../utils/appError");
const redisCache_1 = __importDefault(require("../configs/redisCache"));
const getOrderByStatus = async ({ statusList, userId, role, page = 1, pageSize = 30, ownOnly, isPaging = true, }) => {
    let whereCondition = { status: { [sequelize_1.Op.in]: statusList } };
    if ((role !== "admin" && role !== "manager") || ownOnly === "true") {
        whereCondition.userId = userId;
    }
    const queryOptions = {
        where: whereCondition,
        attributes: { exclude: ["createdAt", "updatedAt"] },
        include: [
            { model: customer_1.Customer, attributes: ["customerName", "companyName"] },
            { model: product_1.Product, attributes: ["typeProduct", "productName", "maKhuon"] },
            { model: box_1.Box, as: "box", attributes: { exclude: ["createdAt", "updatedAt"] } },
            { model: user_1.User, attributes: ["fullName"] },
        ],
        order: [
            //1. sort theo accept -> planning
            [sequelize_1.Sequelize.literal(`CASE WHEN status = '${statusList[0]}' THEN 0 ELSE 1 END`), "ASC"],
            //2. sort theo 3 số đầu của orderId
            [sequelize_1.Sequelize.literal("CAST(SUBSTRING_INDEX(`Order`.`orderId`, '/', 1) AS UNSIGNED)"), "ASC"],
            //3. nếu trùng orderId thì sort theo dateRequestShipping
            ["dateRequestShipping", "ASC"],
        ],
    };
    if (isPaging) {
        queryOptions.offset = (page - 1) * pageSize;
        queryOptions.limit = pageSize;
        const { count, rows } = await order_1.Order.findAndCountAll(queryOptions);
        return {
            data: rows,
            totalOrders: count,
            totalPages: Math.ceil(count / pageSize),
            currentPage: page,
        };
    }
    const rows = await order_1.Order.findAll(queryOptions);
    return { data: rows };
};
exports.getOrderByStatus = getOrderByStatus;
//create order service
const createOrderService = async ({ userId, prefix, customerId, productId, box, ...orderData }) => {
    const validation = await (0, orderHelpers_1.validateCustomerAndProduct)(customerId, productId);
    if (!validation.success)
        throw new appError_1.AppError(validation.message || "Unknown error", 400);
    //create id + number auto increase
    const newOrderId = await (0, orderHelpers_1.generateOrderId)(prefix);
    //create order
    const newOrder = await order_1.Order.create({
        orderId: newOrderId,
        customerId: customerId,
        productId: productId,
        userId: userId,
        ...orderData,
    });
    //create table data
    if (newOrder.isBox) {
        try {
            await (0, orderHelpers_1.createDataTable)(newOrderId, box_1.Box, box);
        }
        catch (error) {
            console.error("Error creating related data:", error);
            throw new appError_1.AppError("Failed to create related data", 500);
        }
    }
    await redisCache_1.default.del(`orders:${userId}:pending_reject`);
    return { newOrder, newOrderId };
};
exports.createOrderService = createOrderService;
//update order service
const updateOrderService = async ({ userId, orderId, box, ...orderData }) => {
    const order = await order_1.Order.findOne({ where: { orderId } });
    if (!order) {
        throw new appError_1.AppError("Order not found", 404);
    }
    await order.update({
        ...orderData,
    });
    if (order.isBox) {
        await (0, orderHelpers_1.updateChildOrder)(orderId, box_1.Box, box);
    }
    else {
        await box_1.Box.destroy({ where: { orderId } });
    }
    await redisCache_1.default.del(`orders:${userId}:pending_reject`);
    return order;
};
exports.updateOrderService = updateOrderService;
//delete order service
const deleteOrderService = async ({ orderId, userId, }) => {
    const deleted = await order_1.Order.destroy({ where: { orderId } });
    if (!deleted) {
        throw new appError_1.AppError("Order delete failed", 404);
    }
    await redisCache_1.default.del(`orders:${userId}:pending_reject`);
    return true;
};
exports.deleteOrderService = deleteOrderService;
//# sourceMappingURL=orderService.js.map