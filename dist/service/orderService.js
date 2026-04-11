"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderService = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const sequelize_1 = require("sequelize");
const box_1 = require("../models/order/box");
const appError_1 = require("../utils/appError");
const order_1 = require("../models/order/order");
const orderImage_1 = require("../models/order/orderImage");
const cacheKey_1 = require("../utils/helper/cache/cacheKey");
const meiliService_1 = require("./meiliService");
const redis_connect_1 = __importDefault(require("../assest/configs/connect/redis.connect"));
const orderRepository_1 = require("../repository/orderRepository");
const cacheManager_1 = require("../utils/helper/cache/cacheManager");
const transactionHelper_1 = require("../utils/helper/transactionHelper");
const crud_helper_repository_1 = require("../repository/helper/crud.helper.repository");
const meilisearch_connect_1 = require("../assest/configs/connect/meilisearch.connect");
const orderHelpers_1 = require("../utils/helper/modelHelper/orderHelpers");
const meiliTransformer_1 = require("../assest/configs/meilisearch/meiliTransformer");
const labelFields_1 = require("../assest/labelFields");
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
                const cachedData = await redis_connect_1.default.get(cacheKey);
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
            await redis_connect_1.default.set(cacheKey, JSON.stringify(result), "EX", 3600);
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
                const cachedResult = await (0, orderHelpers_1.cachedStatus)(redis_connect_1.default, "pending", "reject", userId, role);
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
            await redis_connect_1.default.set(cacheKey, JSON.stringify(result), "EX", 3600);
            return { message: "Get all orders from DB with status: pending and reject", ...result };
        }
        catch (error) {
            console.error("Error in getOrderPendingAndReject:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    getOrderByField: async ({ field, keyword, page, pageSize, user }) => {
        const { userId, role } = user;
        try {
            const validFields = ["orderId", "customerName", "productName", "QC_box", "price"];
            if (!validFields.includes(field)) {
                throw appError_1.AppError.BadRequest(`Field '${field}' is not supported for search`, "INVALID_FIELD");
            }
            const index = meilisearch_connect_1.meiliClient.index("orders");
            // Phân quyền và Trạng thái
            let filters = ["status IN [accept, planning]"];
            if (role !== "admin" && role !== "manager") {
                filters.push(`userId = ${userId}`);
            }
            // Tìm kiếm trên Meilisearch để lấy orderId
            const searchResult = await index.search(keyword, {
                filter: filters.join(" AND "),
                attributesToSearchOn: [field],
                attributesToRetrieve: ["orderId"], // Chỉ lấy orderId
                page: Number(page) || 1,
                hitsPerPage: Number(pageSize) || 25,
            });
            const orderIds = searchResult.hits.map((hit) => hit.orderId);
            if (orderIds.length === 0) {
                return {
                    message: "No orders found",
                    data: [],
                    totalOrders: 0,
                    totalPages: 1,
                    currentPage: page,
                };
            }
            // Truy vấn DB để lấy data dựa trên orderIds
            const query = orderRepository_1.orderRepository.buildQueryOptions({ orderId: { [sequelize_1.Op.in]: orderIds } });
            const fullOrders = await order_1.Order.findAll(query);
            // Sắp xếp lại thứ tự của SQL theo đúng thứ tự của Meilisearch
            const finalData = orderIds
                .map((id) => fullOrders.find((order) => order.orderId === id))
                .filter(Boolean);
            return {
                message: "Get orders from Meilisearch & DB successfully",
                data: finalData,
                totalOrders: searchResult.totalHits,
                totalPages: searchResult.totalPages,
                currentPage: page,
            };
        }
        catch (error) {
            console.error(`❌ Failed to get orders by ${field}:`, error);
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
    createOrder: async (req) => {
        const { userId } = req.user;
        const { orderData } = req.body;
        const parsedOrderData = typeof orderData === "string" ? JSON.parse(orderData) : orderData;
        const { prefix = "DH", customerId, productId, box, imageData, ...restOrderData } = parsedOrderData;
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                if (!userId) {
                    throw appError_1.AppError.BadRequest("Invalid userId parameter", "INVALID_FIELD");
                }
                const validation = await (0, orderHelpers_1.validateCustomerAndProduct)(customerId, productId);
                if (!validation.success)
                    throw appError_1.AppError.NotFound(validation.message);
                //create id + number auto increase
                const metrics = await (0, orderHelpers_1.calculateOrderMetrics)(restOrderData);
                const { newOrderId, existingCustomerId } = await (0, orderHelpers_1.generateOrderId)(prefix);
                if (existingCustomerId && existingCustomerId !== customerId) {
                    throw appError_1.AppError.Conflict(`Mã đơn hàng: ${newOrderId} đã liên kết với khách hàng ${existingCustomerId}.`, "PREFIX_CUSTOMER_MISMATCH");
                }
                //create order
                const newOrder = await order_1.Order.create({
                    orderId: newOrderId,
                    customerId: customerId,
                    productId: productId,
                    userId: userId,
                    ...restOrderData,
                    ...metrics,
                }, { transaction });
                //Cập nhật thông tin hình ảnh
                if (imageData && imageData.imageUrl && imageData.publicId) {
                    const newImagePayload = {
                        orderId: newOrderId,
                        publicId: imageData.publicId,
                        imageUrl: imageData.imageUrl,
                    };
                    await orderImage_1.OrderImage.create(newImagePayload, { transaction });
                }
                //create table data
                if (newOrder.isBox) {
                    try {
                        await (0, orderHelpers_1.createDataTable)({
                            model: box_1.Box,
                            data: { orderId: newOrderId, ...box },
                            transaction,
                        });
                    }
                    catch (error) {
                        console.error("Error creating related data:", error);
                        if (error instanceof appError_1.AppError)
                            throw error;
                        throw appError_1.AppError.ServerError();
                    }
                }
                //--------------------MEILISEARCH-----------------------
                const orderCreated = await orderRepository_1.orderRepository.findOrderForMeili(newOrderId, transaction);
                if (orderCreated) {
                    const flattenData = meiliTransformer_1.meiliTransformer.order(orderCreated);
                    meiliService_1.meiliService.syncMeiliData(labelFields_1.MEILI_INDEX.ORDERS, flattenData);
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
    updateOrder: async (req, orderId) => {
        const { orderData } = req.body;
        const parsedOrderData = typeof orderData === "string" ? JSON.parse(orderData) : orderData;
        const { box, imageData, isDeleteImage, ...restOrderData } = parsedOrderData;
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const order = await crud_helper_repository_1.CrudHelper.findOne({ model: order_1.Order, whereCondition: { orderId } });
                if (!order) {
                    throw appError_1.AppError.NotFound("Order not found");
                }
                const mergedData = { ...order.toJSON(), ...restOrderData };
                const metrics = await (0, orderHelpers_1.calculateOrderMetrics)(mergedData);
                //Cập nhật thông tin hoặc xóa hình ảnh
                if (isDeleteImage) {
                    await orderImage_1.OrderImage.destroy({ where: { orderId }, transaction });
                }
                else if (imageData && imageData.imageUrl && imageData.publicId) {
                    const existedImg = await orderImage_1.OrderImage.findOne({
                        where: { orderId },
                        transaction,
                    });
                    const newImagePayload = {
                        orderId: orderId,
                        publicId: imageData.publicId,
                        imageUrl: imageData.imageUrl,
                    };
                    if (existedImg) {
                        await existedImg.update(newImagePayload, { transaction });
                    }
                    else {
                        await orderImage_1.OrderImage.create(newImagePayload, { transaction });
                    }
                }
                await order.update({ ...restOrderData, ...metrics }, { transaction });
                if (order.isBox) {
                    await (0, orderHelpers_1.updateChildTable)({
                        model: box_1.Box,
                        where: { orderId },
                        data: { orderId, ...box },
                        transaction,
                    });
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
                //--------------------MEILISEARCH-----------------------
                const orderUpdated = await orderRepository_1.orderRepository.findOrderForMeili(orderId, transaction);
                if (orderUpdated) {
                    const flattenData = meiliTransformer_1.meiliTransformer.order(orderUpdated);
                    meiliService_1.meiliService.syncMeiliData(labelFields_1.MEILI_INDEX.ORDERS, flattenData);
                }
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
                const order = await order_1.Order.findOne({ where: { orderId }, transaction });
                if (!order) {
                    throw appError_1.AppError.NotFound("Order không tồn tại");
                }
                //save value before delete for meilisearch
                const orderValue = order.orderSortValue;
                await order.destroy({ transaction });
                //--------------------MEILISEARCH-----------------------
                meiliService_1.meiliService.deleteMeiliData(labelFields_1.MEILI_INDEX.ORDERS, orderValue);
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