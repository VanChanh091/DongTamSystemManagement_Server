"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchInboundByField = exports.getAllInboundHistory = exports.getBoxCheckedDetail = exports.getBoxWaitingChecked = exports.getPaperWaitingChecked = void 0;
const inboundService_1 = require("../../../service/warehouse/inboundService");
//====================================CHECK AND INBOUND QTY========================================
//get paper checked
const getPaperWaitingChecked = async (req, res, next) => {
    try {
        const response = await inboundService_1.inboundService.getPaperWaitingChecked();
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getPaperWaitingChecked = getPaperWaitingChecked;
//get box checked
const getBoxWaitingChecked = async (req, res, next) => {
    try {
        const response = await inboundService_1.inboundService.getBoxWaitingChecked();
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getBoxWaitingChecked = getBoxWaitingChecked;
const getBoxCheckedDetail = async (req, res, next) => {
    const { planningBoxId } = req.query;
    try {
        const response = await inboundService_1.inboundService.getBoxCheckedDetail(Number(planningBoxId));
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getBoxCheckedDetail = getBoxCheckedDetail;
//===============================INBOUND HISTORY=====================================
const getAllInboundHistory = async (req, res, next) => {
    const { page, pageSize } = req.query;
    try {
        const response = await inboundService_1.inboundService.getAllInboundHistory(Number(page), Number(pageSize));
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getAllInboundHistory = getAllInboundHistory;
const searchInboundByField = async (req, res, next) => {
    const { field, keyword, page, pageSize } = req.query;
    try {
        const response = await inboundService_1.inboundService.searchInboundByField({
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
exports.searchInboundByField = searchInboundByField;
//# sourceMappingURL=inboundHistoryController.js.map