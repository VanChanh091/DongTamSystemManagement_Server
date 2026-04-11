"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInboundHistory = exports.getPlanningWaitingCheck = void 0;
const inboundService_1 = require("../../../service/warehouse/inboundService");
//====================================CHECK AND INBOUND QTY========================================
const getPlanningWaitingCheck = async (req, res, next) => {
    const { isPaper, planningBoxId } = req.query;
    try {
        let response;
        if (planningBoxId) {
            response = await inboundService_1.inboundService.getBoxCheckedDetail(Number(planningBoxId));
        }
        else {
            if (isPaper === "true") {
                response = await inboundService_1.inboundService.getPaperWaitingChecked();
            }
            else {
                response = await inboundService_1.inboundService.getBoxWaitingChecked();
            }
        }
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getPlanningWaitingCheck = getPlanningWaitingCheck;
//===============================INBOUND HISTORY=====================================
const getInboundHistory = async (req, res, next) => {
    const { field, keyword, page, pageSize } = req.query;
    try {
        let response;
        if (field && keyword) {
            response = await inboundService_1.inboundService.getInboundByField({
                field,
                keyword,
                page: Number(page),
                pageSize: Number(pageSize),
            });
        }
        else {
            response = await inboundService_1.inboundService.getAllInboundHistory(Number(page), Number(pageSize));
        }
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getInboundHistory = getInboundHistory;
//# sourceMappingURL=inboundHistoryController.js.map