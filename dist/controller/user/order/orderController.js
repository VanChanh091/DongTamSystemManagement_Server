"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteOrder = exports.updateOrder = exports.addOrder = exports.getOrderPendingAndReject = exports.getOrderByField = exports.getOrderAcceptAndPlanning = void 0;
const orderService_1 = require("../../../service/orderService");
//===============================ACCEPT AND PLANNING=====================================
//get order status accept and planning
const getOrderAcceptAndPlanning = async (req, res) => {
    const { page = 1, pageSize = 20, ownOnly = "false", } = req.query;
    try {
        const response = await orderService_1.orderService.getOrderAcceptAndPlanning(Number(page), Number(pageSize), ownOnly, req.user);
        return res.status(201).json(response);
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.getOrderAcceptAndPlanning = getOrderAcceptAndPlanning;
const getOrderByField = async (req, res) => {
    const { field, keyword, page, pageSize } = req.query;
    try {
        const response = await orderService_1.orderService.getOrderByField(field, keyword, Number(page), Number(pageSize), req.user);
        return res.status(201).json(response);
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.getOrderByField = getOrderByField;
//===============================PENDING AND REJECT=====================================
//get order pending and reject
const getOrderPendingAndReject = async (req, res) => {
    const { ownOnly = "false" } = req.query;
    try {
        const response = await orderService_1.orderService.getOrderPendingAndReject(ownOnly, req.user);
        return res.status(201).json(response);
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.getOrderPendingAndReject = getOrderPendingAndReject;
//add order
const addOrder = async (req, res) => {
    try {
        const response = await orderService_1.orderService.createOrder(req.user, req.body);
        return res.status(201).json(response);
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.addOrder = addOrder;
// update order
const updateOrder = async (req, res) => {
    const { orderId } = req.query;
    try {
        const response = await orderService_1.orderService.updateOrder(req.body, orderId);
        return res.status(201).json(response);
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.updateOrder = updateOrder;
// delete order
const deleteOrder = async (req, res) => {
    const { id } = req.query;
    try {
        const response = await orderService_1.orderService.deleteOrder(id);
        return res.status(201).json(response);
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.deleteOrder = deleteOrder;
//# sourceMappingURL=orderController.js.map