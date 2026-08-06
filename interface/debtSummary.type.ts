interface AgingBucket {
  inTerm: number;
  overdue1_30: number;
  overdue31_60: number;
  overdue61_90: number;
  overdueOver90: number;
}

export interface DebtItemDTO {
  customerId: string;
  customerName: string;
  totalDebt: number;
  closedDebt: number;
  currentPeriodDebt: number;
  dueDebt: number;
  notDueDebt: number;
  unpaidOutboundCount: number;
  aging: AgingBucket;
}
