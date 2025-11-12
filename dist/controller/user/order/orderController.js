"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteOrder = exports.updateOrder = exports.addOrder = exports.getOrderPendingAndReject = exports.getOrderByField = exports.getOrderAcceptAndPlanning = void 0;
const orderHelpers_1 = require("../../../utils/helper/modelHelper/orderHelpers");
const orderService_1 = require("../../../service/orderService");
const order_1 = require("../../../models/order/order");
const cacheManager_1 = require("../../../utils/helper/cacheManager");
const redisCache_1 = __importDefault(require("../../../configs/redisCache"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const devEnvironment = process.env.NODE_ENV !== "production";
//===============================ACCEPT AND PLANNING=====================================
//get order status accept and planning
const getOrderAcceptAndPlanning = async (req, res) => {
    const { userId, role } = req.user;
    const { page, pageSize, ownOnly = "false", } = req.query;
    const currentPage = Number(page);
    const currentPageSize = Number(pageSize);
    const { order } = cacheManager_1.CacheManager.keys;
    const keyRole = role === "admin" || role === "manager" ? "all" : `userId:${userId}`;
    const cacheKey = order.acceptPlanning(keyRole, currentPage); //orders:admin:accept_planning:page:1
    try {
        const { isChanged } = await cacheManager_1.CacheManager.check([{ model: order_1.Order, where: { status: ["accept", "planning"] } }], "orderAccept");
        if (isChanged) {
            await cacheManager_1.CacheManager.clearOrderAcceptPlanning(keyRole);
        }
        else {
            const cachedData = await redisCache_1.default.get(cacheKey);
            if (cachedData) {
                if (devEnvironment)
                    console.log("✅ Data Order accept_planning from Redis");
                const parsed = JSON.parse(cachedData);
                return res.status(200).json({
                    message: "Get Order from cache",
                    ...parsed,
                });
            }
        }
        // Lấy data đã lọc từ cachedStatus
        const result = await (0, orderService_1.getOrderByStatus)({
            statusList: ["accept", "planning"],
            userId,
            role,
            page: currentPage,
            pageSize: currentPageSize,
            ownOnly,
            isPaging: true,
        });
        await redisCache_1.default.set(cacheKey, JSON.stringify(result), "EX", 3600);
        res.status(200).json({
            message: "Get all orders from DB with status: accept and planning",
            ...result,
        });
    }
    catch (error) {
        console.error("Error in getOrderAcceptAndPlanning:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.getOrderAcceptAndPlanning = getOrderAcceptAndPlanning;
const getOrderByField = async (req, res) => {
    const { userId, role } = req.user;
    const { field, keyword, page, pageSize } = req.query;
    const fieldMap = {
        customerName: (order) => order?.Customer?.customerName,
        productName: (order) => order?.Product?.productName,
        qcBox: (order) => order?.QC_box,
        price: (order) => order?.price,
    };
    const key = field;
    if (!fieldMap[key]) {
        return res.status(400).json({ message: "Invalid field parameter" });
    }
    const { order } = cacheManager_1.CacheManager.keys;
    try {
        const result = await (0, orderHelpers_1.filterOrdersFromCache)({
            userId,
            role,
            keyword,
            getFieldValue: fieldMap[key],
            page,
            pageSize,
            cacheKeyPrefix: order.searchAcceptPlanning,
            message: `Get orders by ${field} from filtered cache`,
        });
        return res.status(200).json(result);
    }
    catch (error) {
        console.error(`Failed to get orders by ${field}:`, error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};
exports.getOrderByField = getOrderByField;
//===============================PENDING AND REJECT=====================================
//get order pending and reject
const getOrderPendingAndReject = async (req, res) => {
    const { userId, role } = req.user;
    const { ownOnly = "false" } = req.query;
    if (!userId) {
        return res.status(400).json({ message: "Missing userId" });
    }
    const { order } = cacheManager_1.CacheManager.keys;
    const keyRole = role === "admin" || role === "manager" ? "all" : `userId:${userId}`;
    const cacheKey = order.pendingReject(keyRole);
    try {
        const { isChanged } = await cacheManager_1.CacheManager.check([{ model: order_1.Order, where: { status: ["pending", "reject"] } }], "orderPending");
        if (isChanged) {
            await cacheManager_1.CacheManager.clearOrderPendingReject(keyRole);
        }
        else {
            const cachedResult = await (0, orderHelpers_1.cachedStatus)(redisCache_1.default, "pending", "reject", userId, role);
            if (cachedResult) {
                if (devEnvironment)
                    console.log("✅ Data Order pending_reject from Redis");
                return res.status(200).json({
                    message: "Get Order from cache",
                    data: cachedResult,
                });
            }
        }
        const result = await (0, orderService_1.getOrderByStatus)({
            statusList: ["pending", "reject"],
            userId,
            role,
            ownOnly,
            isPaging: false,
        });
        await redisCache_1.default.set(cacheKey, JSON.stringify(result), "EX", 3600);
        res.status(200).json({
            message: "Get all orders from DB with status: pending and reject",
            ...result,
        });
    }
    catch (error) {
        console.error("Error in getOrderPendingAndReject:", error);
        res.status(500).json({ message: error.message });
    }
};
exports.getOrderPendingAndReject = getOrderPendingAndReject;
//add order
const addOrder = async (req, res) => {
    const { userId } = req.user;
    const { prefix, customerId, productId, box, ...orderData } = req.body;
    try {
        const { newOrder, newOrderId } = await (0, orderService_1.createOrderService)({
            userId,
            prefix,
            customerId,
            productId,
            box,
            ...orderData,
        });
        res.status(201).json({ order: newOrder, orderId: newOrderId });
    }
    catch (error) {
        console.error("Create order error:", error);
        res.status(500).json({ error: error.message });
    }
};
exports.addOrder = addOrder;
// update order
const updateOrder = async (req, res) => {
    const { orderId } = req.query;
    const { box, ...orderData } = req.body;
    const { userId } = req.user;
    try {
        await (0, orderService_1.updateOrderService)({ userId, orderId, box, ...orderData });
        res.status(200).json({ message: "Order updated successfully" });
    }
    catch (error) {
        console.error("update order failed:", error);
        res.status(500).json({
            message: "update order failed",
            error: error.message,
        });
    }
};
exports.updateOrder = updateOrder;
// delete order
const deleteOrder = async (req, res) => {
    const { id } = req.query;
    const { userId } = req.user;
    try {
        await (0, orderService_1.deleteOrderService)({ orderId: id, userId });
        res.status(200).json({ message: "Order deleted successfully" });
    }
    catch (error) {
        console.error("Delete order failed:", error);
        res.status(500).json({ error: error.message });
    }
};
exports.deleteOrder = deleteOrder;
//# sourceMappingURL=orderController.js.map