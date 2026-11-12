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
 * - Box orders (isBox = true): 80%
 *
 * Returns an unrounded float; callers should round only at daily/row/summary boundaries
 * to avoid cumulative rounding drift.
 */
export const calcPaperStageRevenue = (
  totalPrice: number | string | null | undefined,
  isBox: boolean | number | string | null | undefined,
): number => {
  const amount = Number(totalPrice || 0);
  if (!Number.isFinite(amount) || amount === 0) return 0;

  const ratio = isBoxOrderFlag(isBox)
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
