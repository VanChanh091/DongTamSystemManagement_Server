"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteOrder = exports.updateOrder = exports.addOrder = exports.getOrderPendingAndReject = exports.getOrdersAcceptPlanning = exports.getCloudinarySignature = exports.getOrderDetail = exports.getOrderIdRaw = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const orderService_1 = require("../../../service/orderService");
const connectCloudinary_1 = __importDefault(require("../../../assest/configs/connectCloudinary"));
//===============================ORDER AUTOCOMPLETE=====================================
const getOrderIdRaw = async (req, res, next) => {
    const { orderId } = req.query;
    try {
        const response = await orderService_1.orderService.getOrderIdRaw(orderId);
        return res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getOrderIdRaw = getOrderIdRaw;
const getOrderDetail = async (req, res, next) => {
    const { orderId } = req.query;
    try {
        const response = await orderService_1.orderService.getOrderDetail(orderId);
        return res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getOrderDetail = getOrderDetail;
//===============================CLOUDINARY IMAGE=====================================
const getCloudinarySignature = async (req, res) => {
    const { CLOUDINARY_API_SECRET, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY } = process.env;
    // Kiểm tra xem các biến môi trường có tồn tại không
    if (!CLOUDINARY_API_SECRET || !CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY) {
        return res.status(500).json({
            message: "Cloudinary configuration is missing in environment variables",
        });
    }
    const timestamp = Math.round(new Date().getTime() / 1000);
    const folder = "orders";
    // Bây giờ TypeScript sẽ biết chắc chắn CLOUDINARY_API_SECRET là string
    const signature = connectCloudinary_1.default.utils.api_sign_request({ timestamp, folder }, CLOUDINARY_API_SECRET);
    return res.json({
        signature,
        timestamp,
        cloudName: CLOUDINARY_CLOUD_NAME,
        apiKey: CLOUDINARY_API_KEY,
        folder,
    });
};
exports.getCloudinarySignature = getCloudinarySignature;
//===============================ACCEPT AND PLANNING=====================================
const getOrdersAcceptPlanning = async (req, res, next) => {
    const { field, keyword, page = 1, pageSize = 20, ownOnly = "false", } = req.query;
    try {
        let response;
        // 1. Nhánh tìm kiếm theo field
        if (field && keyword) {
            response = await orderService_1.orderService.getOrderByField(field, keyword, Number(page), Number(pageSize), req.user);
        }
        // 2. Nhánh lấy tất cả
        else {
            response = await orderService_1.orderService.getOrderAcceptAndPlanning(Number(page), Number(pageSize), ownOnly, req.user);
        }
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getOrdersAcceptPlanning = getOrdersAcceptPlanning;
//===============================PENDING AND REJECT=====================================
//get order pending and reject
const getOrderPendingAndReject = async (req, res, next) => {
    const { ownOnly = "false" } = req.query;
    try {
        const response = await orderService_1.orderService.getOrderPendingAndReject(ownOnly, req.user);
        return res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getOrderPendingAndReject = getOrderPendingAndReject;
//add order
const addOrder = async (req, res, next) => {
    try {
        const response = await orderService_1.orderService.createOrder(req);
        return res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.addOrder = addOrder;
// update order
const updateOrder = async (req, res, next) => {
    const { orderId } = req.query;
    try {
        const response = await orderService_1.orderService.updateOrder(req, orderId);
        return res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateOrder = updateOrder;
// delete order
const deleteOrder = async (req, res, next) => {
    const { orderId } = req.query;
    try {
        const response = await orderService_1.orderService.deleteOrder(orderId);
        return res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.deleteOrder = deleteOrder;
//# sourceMappingURL=orderController.js.map