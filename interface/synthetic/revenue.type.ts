//using for revenue daily
export interface CustomerDailySalesRow {
  customerId: string | number;
  customerName: string;
  dailyAmounts: Record<number, number>; // Số tiền từng ngày: { 1: 500, 2: 0, ..., 31: 1200 }
  totalCustomerSales: number; // Tổng cả tháng của riêng khách này
  totalCustomerDebt: number; // Dư nợ còn lại của các đơn trong tháng
}

export interface DailyRevenueReportResponse {
  message: string;
  filter: {
    month: number;
    year: number;
    userId: number | null;
  };
  summary: {
    totalMonthSales: number; // Tổng doanh số cả tháng của tất cả khách
    totalMonthDebt: number; // Tổng nợ chưa thu của toàn bộ tháng
    dailyTotals: Record<number, number>; // Dòng chân trang: Tổng toàn bộ khách theo từng ngày (1..31)
  };
  daysInMonth: number;

  //pagination
  totalCustomers: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;

  data: CustomerDailySalesRow[];
}

//using for revenue monthly
export interface RevenueReportFilterInput {
  month: number; // 1 - 12
  year?: number; // Mặc định là năm hiện tại
  targetUserId?: number | null; // ID nhân viên muốn xem (nếu là Manager)
  currentUser: {
    userId: number;
    role: "manager" | "admin" | "user" | string;
  };
}

export interface DailyReportRow {
  date: string;
  orderApprovedAmount: number; // DS nhận đơn
  productionAmount: number; // DS sản xuất
  salesAmount: number; // DS bán hàng
  returnAmount: number; // DS trả về
}

export interface MonthlyRevenueReportResponse {
  message: string;
  filter: {
    month: number;
    year: number;
    userId: number | null;
  };
  summary: {
    totalOrderApproved: number;
    totalProduction: number;
    totalSales: number;
    totalReturn: number;
  };
  data: DailyReportRow[];
}

//using for revenue yearly
export interface YearlyReportFilterInput {
  fromYear: number;
  toYear: number;
  targetUserId?: number | null;
  currentUser: {
    userId: number;
    role: "manager" | "admin" | "user" | string;
  };
  page?: number;
  pageSize?: number;
}

export interface YearSalesData {
  months: Record<number, number>; // { 1: 0, 2: 50000000, ..., 12: 12000000 }
  yearTotal: number; // Tổng cả năm đó
}

export interface CustomerMultiYearSales {
  customerId: string;
  customerName: string;
  currentDebt: number;
  years: Record<number, YearSalesData>; // { 2024: YearSalesData, 2025: YearSalesData, ... }
  grandTotal: number; // Tổng tất cả các năm cộng lại
}

export interface YearlyRevenueReportResponse {
  message: string;
  filter: {
    fromYear: number;
    toYear: number;
    userId: number | null;
  };
  years: number[]; // Danh sách các năm [2024, 2025, 2026]
  totalCustomers: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  summary: {
    years: Record<number, YearSalesData>; // Tổng cộng tất cả ds
    grandTotal: number;
    totalCurrentDebt: number;
  };
  data: CustomerMultiYearSales[];
}
