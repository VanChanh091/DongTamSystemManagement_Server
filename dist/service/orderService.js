"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderService = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const orderHelpers_1 = require("../utils/helper/modelHelper/orderHelpers");
const appError_1 = require("../utils/appError");
const redisCache_1 = __importDefault(require("../assest/configs/redisCache"));
const cacheManager_1 = require("../utils/helper/cache/cacheManager");
const box_1 = require("../models/order/box");
const order_1 = require("../models/order/order");
const transactionHelper_1 = require("../utils/helper/transactionHelper");
const orderRepository_1 = require("../repository/orderRepository");
const cacheKey_1 = require("../utils/helper/cache/cacheKey");
const devEnvironment = process.env.NODE_ENV !== "production";
const { order } = cacheKey_1.CacheKey;
exports.orderService = {
    getOrderAcceptAndPlanning: async (page, pageSize, ownOnly, user) => {
        const { userId, role } = user;
        try {
            const keyRole = role === "admin" || role === "manager" ? "all" : `userId:${userId}`;
            const cacheKey = order.acceptPlanning(keyRole, page); //orders:all:accept_planning:page:1
            const { isChanged } = await cacheManager_1.CacheManager.check([{ model: order_1.Order, where: { status: ["accept", "planning"] } }], "orderAccept");
            if (isChanged) {
                await cacheManager_1.CacheManager.clear("orderAcceptPlanning", keyRole);
            }
            else {
                const cachedData = await redisCache_1.default.get(cacheKey);
                if (cachedData) {
                    if (devEnvironment)
                        console.log("✅ Data Order accept_planning from Redis");
                    const parsed = JSON.parse(cachedData);
                    return { message: "Get Order from cache", ...parsed };
                }
            }
            // Lấy data đã lọc từ cachedStatus
            const result = await (0, orderHelpers_1.getOrderByStatus)({
                statusList: ["accept", "planning"],
                userId,
                role,
                page: page,
                pageSize: pageSize,
                ownOnly,
                isPaging: true,
            });
            await redisCache_1.default.set(cacheKey, JSON.stringify(result), "EX", 3600);
            return { message: "Get all orders from DB with status: accept and planning", ...result };
        }
        catch (error) {
            console.error("Error in getOrderAcceptAndPlanning:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    getOrderPendingAndReject: async (ownOnly, user) => {
        const { userId, role } = user;
        try {
            if (!userId) {
                throw appError_1.AppError.BadRequest("Invalid userId parameter", "INVALID_FIELD");
            }
            const keyRole = role === "admin" || role === "manager" ? "all" : `userId:${userId}`;
            const cacheKey = order.pendingReject(keyRole);
            const { isChanged } = await cacheManager_1.CacheManager.check([{ model: order_1.Order, where: { status: ["pending", "reject"] } }], "orderPending");
            if (isChanged) {
                await cacheManager_1.CacheManager.clear("orderPendingReject", keyRole);
            }
            else {
                const cachedResult = await (0, orderHelpers_1.cachedStatus)(redisCache_1.default, "pending", "reject", userId, role);
                if (cachedResult) {
                    if (devEnvironment)
                        console.log("✅ Data Order pending_reject from Redis");
                    return { message: "Get Order from cache", data: cachedResult };
                }
            }
            const result = await (0, orderHelpers_1.getOrderByStatus)({
                statusList: ["pending", "reject"],
                userId,
                role,
                ownOnly,
                isPaging: false,
            });
            await redisCache_1.default.set(cacheKey, JSON.stringify(result), "EX", 3600);
            return { message: "Get all orders from DB with status: pending and reject", ...result };
        }
        catch (error) {
            console.error("Error in getOrderPendingAndReject:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    getOrderByField: async (field, keyword, page, pageSize, user) => {
        const { userId, role } = user;
        try {
            const fieldMap = {
                orderId: (order) => order.orderId,
                customerName: (order) => order?.Customer?.customerName,
                productName: (order) => order?.Product?.productName,
                qcBox: (order) => order?.QC_box,
                price: (order) => order?.price,
            };
            const key = field;
            if (!fieldMap[key]) {
                throw appError_1.AppError.BadRequest("Invalid field parameter", "INVALID_FIELD");
            }
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
            return result;
        }
        catch (error) {
            console.error(`Failed to get orders by ${field}:`, error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    //start get Order for auto complete
    getOrderIdRaw: async (orderId) => {
        try {
            const data = await orderRepository_1.orderRepository.getOrderIdRaw(orderId);
            if (data.length === 0) {
                return { message: "No orderId found", data: [] };
            }
            return { message: "Get orderId raw successfully", data };
        }
        catch (error) {
            console.error("Error in getOrderIdRaw:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    getOrderDetail: async (orderId) => {
        try {
            const data = await orderRepository_1.orderRepository.getOrderDetail(orderId);
            if (!data) {
                throw appError_1.AppError.NotFound("OrderId not found", "ORDER_ID_NOT_FOUND");
            }
            return { message: "Get orderId autocomplete successfully", data };
        }
        catch (error) {
            console.error("Error in getOrderAutocomplete:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    //end get Order for auto complete
    //create order service
    createOrder: async (user, data) => {
        const { userId } = user;
        const { prefix, customerId, productId, box, ...orderData } = data;
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                if (!userId) {
                    throw appError_1.AppError.BadRequest("Invalid userId parameter", "INVALID_FIELD");
                }
                const validation = await (0, orderHelpers_1.validateCustomerAndProduct)(customerId, productId);
                if (!validation.success)
                    throw appError_1.AppError.NotFound(validation.message);
                //create id + number auto increase
                const metrics = await (0, orderHelpers_1.calculateOrderMetrics)(orderData);
                const newOrderId = await (0, orderHelpers_1.generateOrderId)(prefix);
                //create order
                const newOrder = await order_1.Order.create({
                    orderId: newOrderId,
                    customerId: customerId,
                    productId: productId,
                    userId: userId,
                    ...orderData,
                    ...metrics,
                }, { transaction });
                //create table data
                if (newOrder.isBox) {
                    try {
                        await (0, orderHelpers_1.createDataTable)(newOrderId, box_1.Box, box);
                    }
                    catch (error) {
                        console.error("Error creating related data:", error);
                        if (error instanceof appError_1.AppError)
                            throw error;
                        throw appError_1.AppError.ServerError();
                    }
                }
                return { order: newOrder, orderId: newOrderId };
            });
        }
        catch (error) {
            console.error("Error in getOrderPendingAndReject:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    //update order service
    updateOrder: async (req, data, orderId) => {
        const { box, ...orderData } = data;
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const order = await order_1.Order.findOne({ where: { orderId } });
                if (!order) {
                    throw appError_1.AppError.NotFound("Order not found");
                }
                const mergedData = { ...order.toJSON(), ...orderData };
                const metrics = await (0, orderHelpers_1.calculateOrderMetrics)(mergedData);
                await order.update({ ...orderData, ...metrics }, { transaction });
                if (order.isBox) {
                    await (0, orderHelpers_1.updateChildOrder)(orderId, box_1.Box, box);
                }
                else {
                    await box_1.Box.destroy({ where: { orderId } });
                }
                //update socket for reject order
                const ownerId = order.userId;
                const badgeCount = await order_1.Order.count({
                    where: { status: "reject", userId: ownerId },
                    transaction,
                });
                req.io?.to(`reject-order-${ownerId}`).emit("updateBadgeCount", {
                    type: "REJECTED_ORDER",
                    count: badgeCount,
                });
                return { message: "Order updated successfully", data: order };
            });
        }
        catch (error) {
            console.error("Error in getOrderPendingAndReject:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    //delete order service
    deleteOrder: async (orderId) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const deleted = await order_1.Order.destroy({ where: { orderId }, transaction });
                if (deleted === 0) {
                    throw appError_1.AppError.NotFound("Order không tồn tại");
                }
                return { message: "Order deleted successfully" };
            });
        }
        catch (error) {
            console.error("Error in getOrderPendingAndReject:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
};
//# sourceMappingURL=orderService.js.map