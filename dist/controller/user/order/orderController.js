"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPaperCodeForStructure = exports.deleteOrder = exports.updateOrder = exports.addOrder = exports.getOrderPendingAndReject = exports.getOrderAcceptted = exports.getCloudinarySignature = exports.getOrderDetail = exports.getOrderIdRaw = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const orderService_1 = require("../../../service/orderService");
const cloudinary_connect_1 = __importDefault(require("../../../assets/configs/connect/cloudinary.connect"));
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
    const signature = cloudinary_connect_1.default.utils.api_sign_request({ timestamp, folder }, CLOUDINARY_API_SECRET);
    return res.json({
        signature,
        timestamp,
        cloudName: CLOUDINARY_CLOUD_NAME,
        apiKey: CLOUDINARY_API_KEY,
        folder,
    });
};
exports.getCloudinarySignature = getCloudinarySignature;
//===============================ORDERS=====================================
const getOrderAcceptted = async (req, res, next) => {
    const { field, keyword, ownOnly = "false", } = req.query;
    try {
        let response;
        if (field && keyword) {
            response = await orderService_1.orderService.getOrderByField({ field, keyword, user: req.user });
        }
        else {
            response = await orderService_1.orderService.getOrderAcceptted(ownOnly, req.user);
        }
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getOrderAcceptted = getOrderAcceptted;
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
//=========================PAPER CODE FOR STRUCTURE==============================
const getPaperCodeForStructure = async (req, res, next) => {
    try {
        const response = await orderService_1.orderService.getMasterDataForStructure();
        return res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getPaperCodeForStructure = getPaperCodeForStructure;
//# sourceMappingURL=orderController.js.map