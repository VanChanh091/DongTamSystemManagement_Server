"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportExcelOrders = exports.completeOrder = exports.getAllSyntheticOrders = void 0;
const appError_1 = require("../../../utils/appError");
const synthetic_orderService_1 = require("../../../service/synthetic/synthetic.orderService");
const getAllSyntheticOrders = async (req, res, next) => {
    const { page, pageSize, status, allOrders, orderId, field, keyword, startDate, endDate } = req.query;
    try {
        // Xử lý trường hợp status truyền vào là chuỗi phẩy "pending,accepted"
        // hoặc là mảng có sẵn từ query của Express
        let response;
        let statusArray = [];
        if (status) {
            if (typeof status === "string" && status.includes(",")) {
                statusArray = status.split(",");
            }
            else {
                statusArray = status;
            }
        }
        if (orderId) {
            response = await synthetic_orderService_1.syntheticOrderService.getPlanningBoxDetail(orderId);
        }
        else if (field && keyword) {
            response = await synthetic_orderService_1.syntheticOrderService.getSyntheticOrderByField({
                field,
                keyword,
                page: Number(page),
                pageSize: Number(pageSize),
                status: statusArray,
                allOrders,
                startDate,
                endDate,
            });
        }
        else {
            response = await synthetic_orderService_1.syntheticOrderService.getAllOrderByStatus({
                page: Number(page),
                pageSize: Number(pageSize),
                status: statusArray,
                allOrders,
            });
        }
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getAllSyntheticOrders = getAllSyntheticOrders;
const completeOrder = async (req, res, next) => {
    const { orderIds } = req.body;
    try {
        if (!orderIds || (Array.isArray(orderIds) && orderIds.length === 0)) {
            throw appError_1.AppError.BadRequest("Danh sách orderIds không được để trống", "ORDER_IDS_REQUIRED");
        }
        const orderIdsToArray = Array.isArray(orderIds) ? orderIds.map(String) : [String(orderIds)];
        const response = await synthetic_orderService_1.syntheticOrderService.completeOrder(orderIdsToArray);
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.completeOrder = completeOrder;
//export excel
const exportExcelOrders = async (req, res, next) => {
    const { fromDate, toDate } = req.body;
    try {
        await synthetic_orderService_1.syntheticOrderService.exportExcelOrder(res, { fromDate, toDate }, req.user.email);
    }
    catch (error) {
        next(error);
    }
};
exports.exportExcelOrders = exportExcelOrders;
//# sourceMappingURL=synthetic.orderController.js.map