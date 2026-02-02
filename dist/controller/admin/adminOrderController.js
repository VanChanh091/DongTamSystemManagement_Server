"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateStatusAdmin = exports.getOrderPending = void 0;
const adminService_1 = require("../../service/admin/adminService");
//getOrderPending
const getOrderPending = async (req, res, next) => {
    try {
        const response = await adminService_1.adminService.getOrderPending();
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getOrderPending = getOrderPending;
//accept or reject order
const updateStatusAdmin = async (req, res, next) => {
    const { id } = req.query;
    const { newStatus, rejectReason } = req.body;
    try {
        const response = await adminService_1.adminService.updateStatusOrder(id, newStatus, rejectReason);
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateStatusAdmin = updateStatusAdmin;
//# sourceMappingURL=adminOrderController.js.map