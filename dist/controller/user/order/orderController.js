"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteOrder = exports.updateOrder = exports.addOrder = exports.getOrderPendingAndReject = exports.getOrdersAcceptPlanning = exports.getOrderDetail = exports.getOrderIdRaw = void 0;
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
        const response = await orderService_1.orderService.updateOrder(req, req.body, orderId);
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