export const PRODUCTION_REVENUE_RATIOS = {
  PAPER_STAGE_WHEN_PAPER_ONLY: 1,
  PAPER_STAGE_WHEN_BOX: 0.8,
  BOX_INBOUND_STAGE: 0.2,
} as const;

export const PRODUCTION_ACTIVE_ORDER_STATUSES = [
  "accept",
  "planning",
  "completed",
] as const;

const isBoxOrderFlag = (isBox: boolean | number | string | null | undefined): boolean =>
  isBox === true || isBox === 1 || isBox === "1";

/**
 * Stage 1 (corrugated sheet / máy sóng) production revenue rule:
 * - Pure sheet orders (isBox = false): 100%
 * - Box orders (isBox = true): 80% dựa trên tổng tiền đơn hàng và tỷ lệ phôi chạy thực tế / kế hoạch
 *
 * Returns an unrounded float; callers should round only at daily/row/summary boundaries
 * to avoid cumulative rounding drift.
 */
export interface CalcPaperStageRevenueInput {
  rawTotalPrice?: number | string | null;
  isBox?: boolean | number | string | null;
  qtyProduced?: number | string | null;
  runningPlan?: number | string | null;
  orderTotalPrice?: number | string | null;
}

export const calcPaperStageRevenue = (
  input: number | string | null | undefined | CalcPaperStageRevenueInput,
  isBoxLegacy?: boolean | number | string | null | undefined,
): number => {
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
      return (qp / rp) * orderTotal * PRODUCTION_REVENUE_RATIOS.PAPER_STAGE_WHEN_BOX;
    }

    return Number(rawTotalPrice || 0) * PRODUCTION_REVENUE_RATIOS.PAPER_STAGE_WHEN_BOX;
  }

  // Hỗ trợ truyền legacy (totalPrice, isBox)
  const amount = Number(input || 0);
  if (!Number.isFinite(amount) || amount === 0) return 0;

  const ratio = isBoxOrderFlag(isBoxLegacy)
    ? PRODUCTION_REVENUE_RATIOS.PAPER_STAGE_WHEN_BOX
    : PRODUCTION_REVENUE_RATIOS.PAPER_STAGE_WHEN_PAPER_ONLY;

  return amount * ratio;
};

/**
 * Stage 2 (finished box warehouse inbound / nhập kho thùng) production revenue rule:
 * - Box orders (isBox = true): 20% of inbound totalPrice
 */
export const calcBoxInboundStageRevenue = (
  totalPrice: number | string | null | undefined,
): number => {
  const amount = Number(totalPrice || 0);
  if (!Number.isFinite(amount) || amount === 0) return 0;

  return amount * PRODUCTION_REVENUE_RATIOS.BOX_INBOUND_STAGE;
};
