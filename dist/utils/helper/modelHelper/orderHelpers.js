"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrderByStatus = exports.filterDataFromCache = exports.filterOrdersFromCache = exports.cachedStatus = exports.updateChildOrder = exports.createDataTable = exports.generateOrderId = exports.validateCustomerAndProduct = void 0;
exports.formatterStructureOrder = formatterStructureOrder;
const sequelize_1 = require("sequelize");
const customer_1 = require("../../../models/customer/customer");
const product_1 = require("../../../models/product/product");
const order_1 = require("../../../models/order/order");
const redisCache_1 = __importDefault(require("../../../configs/redisCache"));
const orderRepository_1 = require("../../../repository/orderRepository");
const normalizeVN_1 = require("../normalizeVN");
const validateCustomerAndProduct = async (customerId, productId) => {
    const customer = await customer_1.Customer.findOne({ where: { customerId } });
    if (!customer) {
        return { success: false, message: "Customer not found" };
    }
    const product = await product_1.Product.findOne({ where: { productId } });
    if (!product) {
        return { success: false, message: "Product not found" };
    }
    return { success: true };
};
exports.validateCustomerAndProduct = validateCustomerAndProduct;
const generateOrderId = async (prefix) => {
    const sanitizedPrefix = prefix.trim().replace(/\s+/g, "");
    const lastOrder = await order_1.Order.findOne({
        where: { orderId: { [sequelize_1.Op.like]: `${sanitizedPrefix}%` } },
        order: [["orderId", "DESC"]],
    });
    let number = 1;
    if (lastOrder && lastOrder.orderId) {
        const lastNumber = parseInt(lastOrder.orderId.slice(sanitizedPrefix.length), 10);
        if (!isNaN(lastNumber)) {
            number = lastNumber + 1;
        }
    }
    const formattedNumber = number.toString().padStart(3, "0");
    return `${sanitizedPrefix}${formattedNumber}`;
};
exports.generateOrderId = generateOrderId;
const createDataTable = async (id, model, data) => {
    try {
        if (data) {
            await model.create({ orderId: id, ...data });
        }
    }
    catch (error) {
        console.error(`Create table ${model} error:`, error);
        throw error;
    }
};
exports.createDataTable = createDataTable;
const updateChildOrder = async (id, model, data) => {
    try {
        if (data) {
            const existingData = await model.findOne({ where: { orderId: id } });
            if (existingData) {
                await model.update(data, { where: { orderId: id } });
            }
            else {
                await model.create({ orderId: id, ...data });
            }
        }
    }
    catch (error) {
        console.error(`Create table ${model} error:`, error);
    }
};
exports.updateChildOrder = updateChildOrder;
const cachedStatus = async (parsed, prop1, prop2, userId, role) => {
    // Nếu redis lưu thẳng mảng thì parsed là array
    // Nếu redis lưu object {data: [...]}, thì lấy parsed.data
    const ordersArray = Array.isArray(parsed) ? parsed : parsed?.data;
    if (!Array.isArray(ordersArray)) {
        return null;
    }
    let data;
    if (role === "admin" || role === "manager") {
        data = ordersArray.filter((order) => [prop1, prop2].includes(order.status));
    }
    else {
        data = ordersArray.filter((order) => [prop1, prop2].includes(order.status) && order.userId === userId);
    }
    return data.length > 0 ? data : null;
};
exports.cachedStatus = cachedStatus;
const filterOrdersFromCache = async ({ userId, role, keyword, getFieldValue, page, pageSize, cacheKeyPrefix = "orders:default", message, }) => {
    const currentPage = Number(page);
    const currentPageSize = Number(pageSize);
    const lowerKeyword = keyword?.toLowerCase?.() || "";
    // Dùng prefix để tạo key cache
    const keyRole = role === "admin" || role === "manager" ? "all" : `userId:${userId}`;
    const allDataCacheKey = `${cacheKeyPrefix}:${keyRole}`; //orders:accept_planning:all
    // Lấy cache
    let allOrders = await redisCache_1.default.get(allDataCacheKey);
    let sourceMessage = "";
    if (!allOrders) {
        let whereCondition = { status: { [sequelize_1.Op.in]: ["accept", "planning"] } };
        if (role !== "admin" && role !== "manager") {
            whereCondition.userId = userId;
        }
        allOrders = await orderRepository_1.orderRepository.findAllFilter(whereCondition);
        await redisCache_1.default.set(allDataCacheKey, JSON.stringify(allOrders), "EX", 900);
        sourceMessage = "Get all orders from DB";
    }
    else {
        allOrders = JSON.parse(allOrders);
        sourceMessage = message ?? "Get all orders from cache";
    }
    // Lọc
    const filteredOrders = allOrders.filter((order) => {
        const fieldValue = getFieldValue(order);
        return fieldValue != null
            ? (0, normalizeVN_1.normalizeVN)(String(fieldValue).toLowerCase()).includes((0, normalizeVN_1.normalizeVN)(lowerKeyword))
            : false;
    });
    const totalOrders = filteredOrders.length;
    const totalPages = Math.ceil(totalOrders / currentPageSize);
    const offset = (currentPage - 1) * currentPageSize;
    const paginatedOrders = filteredOrders.slice(offset, offset + currentPageSize);
    return {
        message: sourceMessage,
        data: paginatedOrders,
        totalOrders,
        totalPages,
        currentPage,
    };
};
exports.filterOrdersFromCache = filterOrdersFromCache;
const filterDataFromCache = async ({ model, cacheKey, keyword, getFieldValue, page, pageSize, message, fetchFunction, }) => {
    const currentPage = Number(page) || 1;
    const currentPageSize = Number(pageSize) || 20;
    const lowerKeyword = keyword?.toLowerCase?.() || "";
    try {
        let allData = await redisCache_1.default.get(cacheKey);
        let sourceMessage = "";
        if (!allData) {
            allData = fetchFunction ? await fetchFunction() : await model.findAll();
            await redisCache_1.default.set(cacheKey, JSON.stringify(allData), "EX", 900);
            sourceMessage = `Get ${cacheKey} from DB`;
        }
        else {
            allData = JSON.parse(allData);
            sourceMessage = message || `Get ${cacheKey} from cache`;
        }
        // Lọc dữ liệu
        const filteredData = allData.filter((item) => {
            const fieldValue = getFieldValue(item);
            return fieldValue != null
                ? (0, normalizeVN_1.normalizeVN)(String(fieldValue).toLowerCase()).includes((0, normalizeVN_1.normalizeVN)(lowerKeyword))
                : false;
        });
        // Phân trang
        const totalCustomers = filteredData.length;
        const totalPages = Math.ceil(totalCustomers / currentPageSize);
        const offset = (currentPage - 1) * currentPageSize;
        const paginatedData = filteredData.slice(offset, offset + currentPageSize);
        return {
            message: sourceMessage,
            data: paginatedData,
            totalCustomers,
            totalPages,
            currentPage,
        };
    }
    catch (error) {
        console.error(error);
        throw new Error("Lỗi server");
    }
};
exports.filterDataFromCache = filterDataFromCache;
function formatterStructureOrder(cell) {
    const parts = [
        cell.dayReplace || cell.day,
        cell.songEReplace || cell.songE,
        cell.matEReplace || cell.matE,
        cell.songBReplace || cell.songB,
        cell.matBReplace || cell.matB,
        cell.songCReplace || cell.songC,
        cell.matCReplace || cell.matC,
        cell.songE2Replace || cell.songE2,
    ];
    const formattedParts = [];
    for (const part of parts) {
        if (part && String(part).trim() !== "") {
            formattedParts.push(part);
        }
    }
    return formattedParts.join("/");
}
const getOrderByStatus = async ({ statusList, userId, role, page = 1, pageSize = 30, ownOnly, isPaging = true, }) => {
    let whereCondition = { status: { [sequelize_1.Op.in]: statusList } };
    if ((role !== "admin" && role !== "manager") || ownOnly === "true") {
        whereCondition.userId = userId;
    }
    const queryOptions = orderRepository_1.orderRepository.buildQueryOptions(whereCondition, statusList);
    if (isPaging) {
        queryOptions.offset = (page - 1) * pageSize;
        queryOptions.limit = pageSize;
        const { count, rows } = await orderRepository_1.orderRepository.findAndCountAll(queryOptions);
        return {
            data: rows,
            totalOrders: count,
            totalPages: Math.ceil(count / pageSize),
            currentPage: page,
        };
    }
    const rows = await orderRepository_1.orderRepository.findAll(queryOptions);
    return { data: rows };
};
exports.getOrderByStatus = getOrderByStatus;
//# sourceMappingURL=orderHelpers.js.map