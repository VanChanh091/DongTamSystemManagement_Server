"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteOrder = exports.updateOrder = exports.addOrder = exports.getOrderPendingAndReject = exports.getOrderByField = exports.getOrderAcceptAndPlanning = exports.getOrderDetail = exports.getOrderIdRaw = void 0;
const orderService_1 = require("../../../service/orderService");
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
//===============================ACCEPT AND PLANNING=====================================
//get order status accept and planning
const getOrderAcceptAndPlanning = async (req, res, next) => {
    const { page = 1, pageSize = 20, ownOnly = "false", } = req.query;
    try {
        const response = await orderService_1.orderService.getOrderAcceptAndPlanning(Number(page), Number(pageSize), ownOnly, req.user);
        return res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getOrderAcceptAndPlanning = getOrderAcceptAndPlanning;
const getOrderByField = async (req, res, next) => {
    const { field, keyword, page, pageSize } = req.query;
    try {
        const response = await orderService_1.orderService.getOrderByField(field, keyword, Number(page), Number(pageSize), req.user);
        return res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getOrderByField = getOrderByField;
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
        const response = await orderService_1.orderService.createOrder(req.user, req.body);
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
        const response = await orderService_1.orderService.updateOrder(req.body, orderId);
        return res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateOrder = updateOrder;
// delete order
const deleteOrder = async (req, res, next) => {
    const { id } = req.query;
    try {
        const response = await orderService_1.orderService.deleteOrder(id);
        return res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.deleteOrder = deleteOrder;
//# sourceMappingURL=orderController.js.map