"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportFileOutbound = exports.getOrderInboundQty = exports.searchOrderIds = exports.searchOutboundByField = exports.deleteOutbound = exports.updateOutbound = exports.createOutbound = exports.getOutboundDetail = exports.getAllOutboundHistory = void 0;
const outboundService_1 = require("../../../service/warehouse/outboundService");
const appError_1 = require("../../../utils/appError");
//===============================OUTBOUND HISTORY=====================================
const getAllOutboundHistory = async (req, res, next) => {
    const { page, pageSize } = req.query;
    try {
        const response = await outboundService_1.outboundService.getAllOutboundHistory(Number(page), Number(pageSize));
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getAllOutboundHistory = getAllOutboundHistory;
const getOutboundDetail = async (req, res, next) => {
    const { outboundId } = req.query;
    try {
        const response = await outboundService_1.outboundService.getOutboundDetail(Number(outboundId));
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getOutboundDetail = getOutboundDetail;
const createOutbound = async (req, res, next) => {
    let { outboundDetails } = req.body;
    try {
        if (!Array.isArray(outboundDetails)) {
            if (!outboundDetails) {
                throw appError_1.AppError.BadRequest("outboundDetails phải là mảng hoặc giá trị hợp lệ", "INVALID_ORDER_IDS");
            }
            outboundDetails = [outboundDetails];
        }
        const response = await outboundService_1.outboundService.createOutbound({ outboundDetails });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.createOutbound = createOutbound;
const updateOutbound = async (req, res, next) => {
    let { outboundId, outboundDetails } = req.body;
    try {
        if (!Array.isArray(outboundDetails)) {
            if (!outboundDetails) {
                throw appError_1.AppError.BadRequest("outboundDetails phải là mảng hoặc giá trị hợp lệ", "INVALID_ORDER_IDS");
            }
            outboundDetails = [outboundDetails];
        }
        const response = await outboundService_1.outboundService.updateOutbound({ outboundId, outboundDetails });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateOutbound = updateOutbound;
const deleteOutbound = async (req, res, next) => {
    let { outboundId } = req.query;
    try {
        const response = await outboundService_1.outboundService.deleteOutbound(Number(outboundId));
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.deleteOutbound = deleteOutbound;
const searchOutboundByField = async (req, res, next) => {
    const { field, keyword, page, pageSize } = req.query;
    try {
        const response = await outboundService_1.outboundService.searchOutboundByField({
            field,
            keyword,
            page: Number(page),
            pageSize: Number(pageSize),
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.searchOutboundByField = searchOutboundByField;
const searchOrderIds = async (req, res, next) => {
    const { orderId } = req.query;
    try {
        const response = await outboundService_1.outboundService.searchOrderIds(orderId);
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.searchOrderIds = searchOrderIds;
const getOrderInboundQty = async (req, res, next) => {
    const { orderId } = req.query;
    try {
        const response = await outboundService_1.outboundService.getOrderInboundQty(orderId);
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getOrderInboundQty = getOrderInboundQty;
const exportFileOutbound = async (req, res, next) => {
    const { outboundId } = req.query;
    try {
        await outboundService_1.outboundService.exportFileOutbound(res, Number(outboundId));
    }
    catch (error) {
        next(error);
    }
};
exports.exportFileOutbound = exportFileOutbound;
//# sourceMappingURL=outboundHistoryController.js.map