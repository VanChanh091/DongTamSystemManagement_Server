import { OutboundHistory } from "../models/warehouse/outbound/outboundHistory";
import { PaymentMethodType } from "../models/warehouse/payment/paymentAllocation";

interface AgingBucket {
  dueIn1_3: number; // Sắp tới hạn (≤ 3 ngày)
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

export interface DeductionInput {
  amount: number;
  paymentMethod: PaymentMethodType;
  outboundSlipCodes?: string[];
  customerOutbounds: OutboundHistory[]; // Danh sách PXK chưa trả của khách

  // Map lưu vết cập nhật trên RAM
  updatedOutboundMap: Map<
    number,
    { outbound: OutboundHistory; paidAmount: number; remainingAmount: number }
  >;
  allocationsToCreate: {
    outboundId: number;
    amountAllocation: number;
    paymentMethod: PaymentMethodType;
  }[];
}

export interface ParsedExcelRow {
  rowNumber: number;
  customerId: string;
  amount: number;
  paymentMethod: PaymentMethodType;
  outboundSlipCodes?: string[];
}
