"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportExcelCustomer = exports.deleteCustomer = exports.updateCustomer = exports.createCustomer = exports.checkCustomerInOrders = exports.getCustomers = void 0;
const order_1 = require("../../../models/order/order");
const customerService_1 = require("../../../service/customerService");
const getCustomers = async (req, res, next) => {
    const { field, keyword, page = 1, pageSize = 20, noPaging = false, } = req.query;
    try {
        let response;
        // 1. Nhánh tìm kiếm theo field
        if (field && keyword) {
            response = await customerService_1.customerService.getCustomerByFields({
                field,
                keyword,
                page: Number(page),
                pageSize: Number(pageSize),
            });
        }
        // 2. Nhánh lấy tất cả
        else {
            response = await customerService_1.customerService.getAllCustomers({
                page: Number(page),
                pageSize: Number(pageSize),
                noPaging,
            });
        }
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getCustomers = getCustomers;
//get customerId in orders
const checkCustomerInOrders = async (req, res, next) => {
    const { customerId } = req.query;
    try {
        const orderCount = await order_1.Order.count({ where: { customerId: customerId } });
        return res.status(200).json({ hasOrders: orderCount > 0, orderCount });
    }
    catch (error) {
        next(error);
    }
};
exports.checkCustomerInOrders = checkCustomerInOrders;
//create customer
const createCustomer = async (req, res, next) => {
    try {
        const response = await customerService_1.customerService.createCustomer(req.body);
        return res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.createCustomer = createCustomer;
// update
const updateCustomer = async (req, res, next) => {
    const { customerId } = req.query;
    const { ...customerData } = req.body;
    try {
        const response = await customerService_1.customerService.updateCustomer(customerId, customerData);
        return res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateCustomer = updateCustomer;
// delete
const deleteCustomer = async (req, res, next) => {
    const { customerId } = req.query;
    try {
        const response = await customerService_1.customerService.deleteCustomer(customerId, req.user.role);
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.deleteCustomer = deleteCustomer;
//export excel
const exportExcelCustomer = async (req, res, next) => {
    const { fromDate, toDate, all = false } = req.body;
    try {
        await customerService_1.customerService.exportExcelCustomer(res, { fromDate, toDate, all });
    }
    catch (error) {
        next(error);
    }
};
exports.exportExcelCustomer = exportExcelCustomer;
//# sourceMappingURL=customerController.js.map