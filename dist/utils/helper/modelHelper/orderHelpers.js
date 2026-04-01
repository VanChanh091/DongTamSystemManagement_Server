"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrderByStatus = exports.cachedStatus = exports.updateChildTable = exports.createDataTable = exports.calculateVolume = exports.calculateOrderMetrics = exports.generateOrderId = exports.validateCustomerAndProduct = void 0;
exports.formatterStructureOrder = formatterStructureOrder;
const sequelize_1 = require("sequelize");
const customer_1 = require("../../../models/customer/customer");
const product_1 = require("../../../models/product/product");
const order_1 = require("../../../models/order/order");
const orderRepository_1 = require("../../../repository/orderRepository");
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
    let existingCustomerId = null;
    if (lastOrder && lastOrder.orderId) {
        existingCustomerId = lastOrder.customerId;
        const lastNumber = parseInt(lastOrder.orderId.slice(sanitizedPrefix.length), 10);
        if (!isNaN(lastNumber)) {
            number = lastNumber + 1;
        }
    }
    const formattedNumber = number.toString().padStart(3, "0");
    return {
        newOrderId: `${sanitizedPrefix}${formattedNumber}`,
        existingCustomerId,
    };
};
exports.generateOrderId = generateOrderId;
const calculateFlutePaper = (fields) => {
    const { day, matE, matB, matC, matE2, songE, songB, songC, songE2 } = fields;
    // 1. Đếm tổng số lớp có dữ liệu
    const allFields = [day, matE, matB, matC, matE2, songE, songB, songC, songE2];
    const layersCount = allFields.filter((f) => f && f.trim().length > 0).length;
    // 2. Thu thập các loại sóng hiện có
    const flutesRaw = [];
    if (songE?.trim())
        flutesRaw.push("E");
    if (songB?.trim())
        flutesRaw.push("B");
    if (songC?.trim())
        flutesRaw.push("C");
    if (songE2?.trim())
        flutesRaw.push("E");
    // 3. Sắp xếp sóng theo thứ tự ưu tiên: E -> B -> C
    const fluteOrder = ["E", "B", "C"];
    const sortedFlutes = [];
    for (const f of fluteOrder) {
        flutesRaw.forEach((raw) => {
            if (raw === f)
                sortedFlutes.push(f);
        });
    }
    // Kết quả dạng: "5EB" hoặc "3E"
    return `${layersCount}${sortedFlutes.join("")}`;
};
const calculateOrderMetrics = async (data) => {
    const qty = parseInt(data.quantityCustomer) || 0;
    const length = parseFloat(data.lengthPaperCustomer) || 0;
    const size = parseFloat(data.paperSizeCustomer) || 0;
    const price = parseFloat(data.price) || 0;
    const pricePaper = parseFloat(data.pricePaper) || 0;
    const vat = parseInt(data.vat) || 0;
    // flute
    const flute = calculateFlutePaper(data);
    // acreage
    const acreage = Math.round((length * size * qty) / 10000);
    // price paper
    let totalPricePaper = 0;
    if (data.dvt === "M2" || data.dvt === "Tấm") {
        totalPricePaper = Math.round((length * size * price) / 10000);
    }
    else if (data.dvt === "Tấm Bao Khổ") {
        totalPricePaper = pricePaper;
    }
    else {
        totalPricePaper = Math.round(price);
    }
    // total price & vat
    const totalPrice = Math.round(qty * totalPricePaper);
    const totalPriceVAT = Math.round(totalPrice * (1 + vat / 100));
    const volume = await (0, exports.calculateVolume)({
        flute,
        lengthCustomer: length,
        sizeCustomer: size,
        quantity: qty,
    });
    const responseData = {
        flute,
        acreage,
        pricePaper: totalPricePaper,
        totalPrice,
        totalPriceVAT,
        volume,
    };
    return responseData;
};
exports.calculateOrderMetrics = calculateOrderMetrics;
const calculateVolume = async ({ flute, lengthCustomer, sizeCustomer, quantity, }) => {
    const ratioData = await orderRepository_1.orderRepository.findOneFluteRatio(flute);
    const ratio = ratioData?.ratio ?? 1;
    const baseVolume = (lengthCustomer * sizeCustomer) / 10000;
    const totalVolume = baseVolume * quantity * ratio * 1.3;
    const volumeRaw = Number(Math.round(totalVolume * 100) / 100); //làm tròn, lấy 2 số sau dấu phẩy
    return volumeRaw;
};
exports.calculateVolume = calculateVolume;
const createDataTable = async ({ model, data, transaction, }) => {
    try {
        if (data) {
            await model.create(data, { transaction });
        }
    }
    catch (error) {
        console.error(`Create table ${model} error:`, error);
        throw error;
    }
};
exports.createDataTable = createDataTable;
const updateChildTable = async ({ model, data, where, transaction, }) => {
    try {
        if (!data || Object.keys(data).length === 0)
            return;
        const existingRecord = await model.findOne({ where, transaction });
        if (existingRecord) {
            return await model.update(data, { where, transaction });
        }
        else {
            return await model.create({ ...where, ...data }, { transaction });
        }
    }
    catch (error) {
        console.error(`Create table ${model} error:`, error);
    }
};
exports.updateChildTable = updateChildTable;
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
    const queryOptions = orderRepository_1.orderRepository.buildQueryOptions(whereCondition);
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
//# sourceMappingURL=orderHelpers.js.map