"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calcBoxInboundStageRevenue = exports.calcPaperStageRevenue = exports.PRODUCTION_ACTIVE_ORDER_STATUSES = exports.PRODUCTION_REVENUE_RATIOS = void 0;
exports.PRODUCTION_REVENUE_RATIOS = {
    PAPER_STAGE_WHEN_PAPER_ONLY: 1,
    PAPER_STAGE_WHEN_BOX: 0.8,
    BOX_INBOUND_STAGE: 0.2,
};
exports.PRODUCTION_ACTIVE_ORDER_STATUSES = [
    "accept",
    "planning",
    "completed",
];
const isBoxOrderFlag = (isBox) => isBox === true || isBox === 1 || isBox === "1";
const calcPaperStageRevenue = (input, isBoxLegacy) => {
    // Hỗ trợ truyền dạng object (nghiệp vụ phân bổ theo tỷ lệ đơn hàng)
    if (typeof input === "object" && input !== null) {
        const { rawTotalPrice, isBox, qtyProduced, runningPlan, orderTotalPrice } = input;
        if (!isBoxOrderFlag(isBox)) {
            return Number(rawTotalPrice || 0);
        }
        const rp = Number(runningPlan || 0);
        const qp = Number(qtyProduced || 0);
        const orderTotal = Number(orderTotalPrice || 0);
        if (rp > 0 && orderTotal > 0) {
            return (qp / rp) * orderTotal * exports.PRODUCTION_REVENUE_RATIOS.PAPER_STAGE_WHEN_BOX;
        }
        return Number(rawTotalPrice || 0) * exports.PRODUCTION_REVENUE_RATIOS.PAPER_STAGE_WHEN_BOX;
    }
    // Hỗ trợ truyền legacy (totalPrice, isBox)
    const amount = Number(input || 0);
    if (!Number.isFinite(amount) || amount === 0)
        return 0;
    const ratio = isBoxOrderFlag(isBoxLegacy)
        ? exports.PRODUCTION_REVENUE_RATIOS.PAPER_STAGE_WHEN_BOX
        : exports.PRODUCTION_REVENUE_RATIOS.PAPER_STAGE_WHEN_PAPER_ONLY;
    return amount * ratio;
};
exports.calcPaperStageRevenue = calcPaperStageRevenue;
/**
 * Stage 2 (finished box warehouse inbound / nhập kho thùng) production revenue rule:
 * - Box orders (isBox = true): 20% of inbound totalPrice
 */
const calcBoxInboundStageRevenue = (totalPrice) => {
    const amount = Number(totalPrice || 0);
    if (!Number.isFinite(amount) || amount === 0)
        return 0;
    return amount * exports.PRODUCTION_REVENUE_RATIOS.BOX_INBOUND_STAGE;
};
exports.calcBoxInboundStageRevenue = calcBoxInboundStageRevenue;
//# sourceMappingURL=productionRevenueRule.js.map