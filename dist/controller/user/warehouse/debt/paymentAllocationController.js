"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportExcelPaymentAllocations = exports.getPaymentAlocationHistory = void 0;
const paymentAllocationService_1 = require("../../../../service/debt/paymentAllocationService");
const getPaymentAlocationHistory = async (req, res, next) => {
    const { outboundId } = req.query;
    try {
        const response = await paymentAllocationService_1.paymentAllocationService.getPaymentAlocationHistory({
            outboundId: Number(outboundId),
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getPaymentAlocationHistory = getPaymentAlocationHistory;
const exportExcelPaymentAllocations = async (req, res, next) => {
    const { fromDate, toDate } = req.body;
    try {
        await paymentAllocationService_1.paymentAllocationService.exportExcelPaymentAllocations({
            res,
            fromDate,
            toDate,
            username: req.user.fullName,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.exportExcelPaymentAllocations = exportExcelPaymentAllocations;
//# sourceMappingURL=paymentAllocationController.js.map