"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.statisticRevenueService = void 0;
const appError_1 = require("../../../utils/appError");
const synthetic_reportRepository_1 = require("../../../repository/synthetic/synthetic.reportRepository");
const cacheKey_1 = require("../../../utils/helper/cache/cacheKey");
const redis_connect_1 = __importDefault(require("../../../assets/configs/connect/redis.connect"));
const debtRepository_1 = require("../../../repository/debtRepository");
const normalizeVN_1 = require("../../../utils/helper/normalizeVN");
const devEnvironment = process.env.NODE_ENV !== "production";
const { reports } = cacheKey_1.CacheKey.synthetic;
const VN_TIMEZONE_OFFSET_MS = 25_200_000; // 7 tiếng
const TIMETTL = 7 * 24 * 60 * 60; // 7 ngày
const CACHETTL = 300; // 5 phút
exports.statisticRevenueService = {
    //revenue daily
    getDailyRevenueReport: async (dto) => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1; // 1 - 12
        const year = dto.year || currentYear;
        const month = dto.month;
        const page = Math.max(1, Number(dto.page) || 1);
        const pageSize = Math.max(1, Number(dto.pageSize) || 30);
        const keyword = dto.keyword ? (0, normalizeVN_1.normalizeVN)(dto.keyword) : "";
        try {
            // Phân quyền
            let effectiveUserId = dto.targetUserId ? Number(dto.targetUserId) : null;
            const isManager = ["manager", "admin"].includes(dto.currentUser.role.toLowerCase());
            if (dto.all) {
                effectiveUserId = isManager && dto.targetUserId ? Number(dto.targetUserId) : null;
            }
            else if (!isManager) {
                effectiveUserId = dto.currentUser.userId;
            }
            // Kiểm tra xem tháng được chọn có phải là tháng cũ không
            const cacheKey = reports.revenue_daily(year, month, effectiveUserId ?? "all");
            const isPastMonth = year < currentYear || (year === currentYear && month < currentMonth);
            // Biến chứa toàn bộ ma trận trước khi cắt trang
            let fullReportData = null;
            let isFromCache = false;
            if (isPastMonth) {
                const cached = await redis_connect_1.default.get(cacheKey);
                if (cached) {
                    if (devEnvironment)
                        console.log("✅ Data Customer Matrix from Redis");
                    fullReportData = JSON.parse(cached);
                    isFromCache = true;
                }
            }
            if (!fullReportData) {
                // Xác định biên thời gian
                const paddedMonth = String(month).padStart(2, "0");
                const daysInMonth = new Date(year, month, 0).getDate();
                const startDate = `${year}-${paddedMonth}-01 00:00:00`;
                const endDate = `${year}-${paddedMonth}-${daysInMonth} 23:59:59`;
                const rawRecords = await synthetic_reportRepository_1.syntheticReportRepository.getRawOutboundByCustomer({
                    startDate,
                    endDate,
                    userId: effectiveUserId ?? undefined,
                });
                const customerMap = new Map();
                // Khởi tạo dòng chân trang
                const dailyTotals = {};
                for (let d = 1; d <= daysInMonth; d++)
                    dailyTotals[d] = 0;
                // Gom số thô từ DB vào Map
                for (const record of rawRecords) {
                    const customer = record.Customer;
                    if (!customer?.customerId)
                        continue;
                    const rawDate = record.dateOutbound;
                    if (!rawDate)
                        continue;
                    const timestamp = rawDate instanceof Date ? rawDate.getTime() : new Date(rawDate).getTime();
                    if (Number.isNaN(timestamp))
                        continue;
                    const dayNumber = new Date(timestamp + VN_TIMEZONE_OFFSET_MS).getUTCDate();
                    const amount = Number(record.totalPricePayment) || 0;
                    const debt = Number(record.remainingAmount) || 0;
                    if (amount === 0)
                        continue;
                    if (!customerMap.has(customer.customerId)) {
                        const initialDays = {};
                        for (let d = 1; d <= daysInMonth; d++)
                            initialDays[d] = 0;
                        customerMap.set(customer.customerId, {
                            customerId: customer.customerId,
                            customerName: customer.customerName,
                            dailyAmounts: initialDays,
                            totalCustomerSales: 0,
                            totalCustomerDebt: 0,
                        });
                    }
                    const customerRow = customerMap.get(customer.customerId);
                    customerRow.dailyAmounts[dayNumber] += amount;
                    customerRow.totalCustomerSales += amount;
                    customerRow.totalCustomerDebt += debt;
                    dailyTotals[dayNumber] += amount;
                }
                // Làm tròn từng khách hàng và ô ngày
                const allDetails = Array.from(customerMap.values()).map((row) => {
                    const roundedDaily = {};
                    for (let d = 1; d <= daysInMonth; d++) {
                        roundedDaily[d] = roundInt(row.dailyAmounts[d]);
                    }
                    return {
                        customerId: row.customerId,
                        customerName: row.customerName,
                        dailyAmounts: roundedDaily,
                        totalCustomerSales: roundInt(row.totalCustomerSales),
                        totalCustomerDebt: roundInt(row.totalCustomerDebt),
                    };
                });
                // Làm tròn footer và tính tổng từ allDetails
                for (let d = 1; d <= daysInMonth; d++) {
                    dailyTotals[d] = roundInt(dailyTotals[d]);
                }
                const totalMonthSales = allDetails.reduce((sum, r) => sum + r.totalCustomerSales, 0);
                const totalMonthDebt = allDetails.reduce((sum, r) => sum + r.totalCustomerDebt, 0);
                // Sắp xếp khách có tổng doanh số lớn nhất lên đầu
                allDetails.sort((a, b) => b.totalCustomerSales - a.totalCustomerSales);
                fullReportData = {
                    summary: { totalMonthSales, totalMonthDebt, dailyTotals },
                    daysInMonth,
                    allDetails,
                };
                if (isPastMonth) {
                    await redis_connect_1.default.set(cacheKey, JSON.stringify(fullReportData), "EX", TIMETTL);
                }
            }
            // Lọc theo tên khách hàng & Tính lại Summary tương ứng
            let filteredDetails = fullReportData.allDetails;
            let responseSummary = fullReportData.summary;
            if (keyword) {
                filteredDetails = fullReportData.allDetails.filter((item) => (0, normalizeVN_1.normalizeVN)(item.customerName).includes(keyword));
                // Tính lại dòng footer cho danh sách đã lọc
                const filteredDailyTotals = {};
                for (let d = 1; d <= fullReportData.daysInMonth; d++) {
                    filteredDailyTotals[d] = filteredDetails.reduce((sum, item) => sum + (item.dailyAmounts[d] || 0), 0);
                }
                responseSummary = {
                    totalMonthSales: filteredDetails.reduce((sum, item) => sum + item.totalCustomerSales, 0),
                    totalMonthDebt: filteredDetails.reduce((sum, item) => sum + item.totalCustomerDebt, 0),
                    dailyTotals: filteredDailyTotals,
                };
            }
            // pagination
            const totalCustomers = filteredDetails.length;
            const totalPages = Math.ceil(totalCustomers / pageSize) || 1;
            const startIndex = (page - 1) * pageSize;
            const paginatedDetails = filteredDetails.slice(startIndex, startIndex + pageSize);
            return {
                message: isFromCache
                    ? "Data revenue daily from Redis"
                    : "Data revenue daily generated successfully",
                filter: { month, year, userId: effectiveUserId },
                summary: responseSummary,
                data: paginatedDetails,
                daysInMonth: fullReportData.daysInMonth,
                totalCustomers,
                totalPages,
                currentPage: page,
                pageSize,
            };
        }
        catch (error) {
            console.error("Error getting daily revenue report:", error);
            throw appError_1.AppError.ServerError();
        }
    },
    //revenue monthly
    getMonthlyRevenueReport: async (dto) => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1; // 1 - 12
        const year = dto.year || currentYear;
        const month = dto.month;
        try {
            // Phân quyền
            let effectiveUserId = dto.targetUserId ? Number(dto.targetUserId) : null;
            const isManager = ["manager", "admin"].includes(dto.currentUser.role.toLowerCase());
            if (dto.all) {
                effectiveUserId = isManager && dto.targetUserId ? Number(dto.targetUserId) : null;
            }
            else if (!isManager) {
                effectiveUserId = dto.currentUser.userId;
            }
            // Kiểm tra xem tháng được chọn có phải là tháng cũ không
            const cacheKey = reports.revenue_monthly(year, month, effectiveUserId ?? "all");
            //check past month
            const isPastMonth = year < currentYear || (year === currentYear && month < currentMonth);
            if (isPastMonth) {
                const cached = await redis_connect_1.default.get(cacheKey);
                if (cached) {
                    if (devEnvironment)
                        console.log("✅ Data Revenue monthly from Redis");
                    const cachedData = JSON.parse(cached);
                    return { ...cachedData, message: "Data Revenue monthly from Redis" };
                }
            }
            // Xác định biên thời gian
            const paddedMonth = String(month).padStart(2, "0");
            const startDate = `${year}-${paddedMonth}-01 00:00:00`;
            const daysInMonth = new Date(year, month, 0).getDate();
            const endDate = `${year}-${paddedMonth}-${daysInMonth} 23:59:59`;
            // Chạy 3 query gom nhóm song song
            const [ordersData, inboundData, outboundData] = await Promise.all([
                synthetic_reportRepository_1.syntheticReportRepository.getDailyApprovedOrders({
                    startDate,
                    endDate,
                    userId: effectiveUserId ?? undefined,
                }),
                synthetic_reportRepository_1.syntheticReportRepository.getDailyProductionInbound({
                    startDate,
                    endDate,
                    userId: effectiveUserId ?? undefined,
                }),
                synthetic_reportRepository_1.syntheticReportRepository.getDailyProductionOutbound({
                    startDate,
                    endDate,
                    userId: effectiveUserId ?? undefined,
                }),
            ]);
            // Lọc bỏ đơn trùng lặp
            const uniqueOrdersMap = new Map();
            for (const row of ordersData) {
                if (!uniqueOrdersMap.has(row.orderId)) {
                    uniqueOrdersMap.set(row.orderId, row); // Vì đã sort DESC nên bản ghi đầu tiên là mới nhất
                }
            }
            const latestApprovedOrders = Array.from(uniqueOrdersMap.values());
            // Gom nhóm thành Map
            const orderMap = aggregateDailyAmounts(latestApprovedOrders, (item) => item.createdAt, (item) => item.Order.totalPrice);
            const prodMap = aggregateDailyAmounts(inboundData, (item) => item.createdAt, (item) => item.totalPrice);
            const salesMap = aggregateDailyAmounts(outboundData, (item) => item.createdAt, (item) => item.totalPriceOutbound);
            // 5. Khởi tạo danh sách đủ các ngày trong tháng (từ ngày 1 đến 28/30/31)
            const details = [];
            const summary = {
                totalOrderApproved: 0,
                totalProduction: 0,
                totalSales: 0,
                totalReturn: 0,
            };
            for (let day = 1; day <= daysInMonth; day++) {
                const paddedDay = String(day).padStart(2, "0");
                const dateKey = `${year}-${paddedMonth}-${paddedDay}`;
                const orderAmount = orderMap.get(dateKey) || 0;
                const prodAmount = prodMap.get(dateKey) || 0;
                const saleAmount = salesMap.get(dateKey) || 0;
                const returnAmount = 0;
                details.push({
                    date: dateKey,
                    orderApprovedAmount: orderAmount,
                    productionAmount: prodAmount,
                    salesAmount: saleAmount,
                    returnAmount,
                });
                summary.totalOrderApproved += orderAmount;
                summary.totalProduction += prodAmount;
                summary.totalSales += saleAmount;
            }
            const reportData = {
                message: "Data Revenue monthly generated successfully",
                filter: { month, year, userId: effectiveUserId },
                summary,
                data: details,
            };
            if (isPastMonth) {
                await redis_connect_1.default.set(cacheKey, JSON.stringify(reportData), "EX", TIMETTL); //cache 7 ngày
            }
            return reportData;
        }
        catch (error) {
            console.error("Error getting monthly revenue report:", error);
            throw appError_1.AppError.ServerError();
        }
    },
    //revenue year
    getMultiYearRevenueReport: async (dto) => {
        const currentYear = new Date().getFullYear();
        const fromYear = Number(dto.fromYear) || currentYear;
        const toYear = Number(dto.toYear) || currentYear;
        const page = Math.max(1, Number(dto.page) || 1);
        const pageSize = Math.max(1, Number(dto.pageSize) || 35);
        const keyword = dto.keyword ? (0, normalizeVN_1.normalizeVN)(dto.keyword) : "";
        try {
            if (fromYear > toYear) {
                throw appError_1.AppError.BadRequest("Năm bắt đầu không được lớn hơn năm kết thúc");
            }
            if (toYear - fromYear > 2) {
                throw appError_1.AppError.BadRequest("Khoảng thời gian tra cứu tối đa là 3 năm");
            }
            // Phân quyền
            let effectiveUserId = dto.targetUserId ? Number(dto.targetUserId) : null;
            const isManager = ["manager", "admin"].includes(dto.currentUser.role.toLowerCase());
            if (dto.all) {
                effectiveUserId = isManager && dto.targetUserId ? Number(dto.targetUserId) : null;
            }
            else if (!isManager) {
                effectiveUserId = dto.currentUser.userId;
            }
            // Caching
            const cacheKey = reports.revenue_yearly(fromYear, toYear, effectiveUserId ?? "all");
            let fullReportData = null;
            let isFromCache = false;
            const cached = await redis_connect_1.default.get(cacheKey);
            if (cached) {
                if (devEnvironment)
                    console.log("✅ Data Multi-Year Matrix from Redis");
                fullReportData = JSON.parse(cached);
                isFromCache = true;
            }
            if (!fullReportData) {
                const startDate = `${fromYear}-01-01 00:00:00`;
                const endDate = `${toYear}-12-31 23:59:59`;
                const [rawRecords, unpaidOutbounds] = await Promise.all([
                    synthetic_reportRepository_1.syntheticReportRepository.getRawOutboundMultiYear({
                        startDate,
                        endDate,
                        userId: effectiveUserId,
                    }),
                    debtRepository_1.debtRepository.findOutboundUnpaid({
                        userId: effectiveUserId ?? undefined,
                    }),
                ]);
                // Gom nhóm dư nợ theo từng customerId
                const debtMap = new Map();
                for (const pxk of unpaidOutbounds) {
                    const custId = pxk.customerId;
                    const remaining = Number(pxk.remainingAmount) || 0;
                    debtMap.set(custId, (debtMap.get(custId) || 0) + remaining);
                }
                // Danh sách các năm cần render: [fromYear, ..., toYear]
                const yearsList = [];
                for (let y = fromYear; y <= toYear; y++)
                    yearsList.push(y);
                const customerMap = new Map();
                // Gom số thô doanh số vào Map
                for (const record of rawRecords) {
                    const customer = record.Customer;
                    if (!customer?.customerId)
                        continue;
                    const vnDate = toVNDate(record.dateOutbound);
                    if (!vnDate)
                        continue;
                    const reportYear = vnDate.getUTCFullYear();
                    const reportMonth = vnDate.getUTCMonth() + 1; // 1 -> 12
                    const amount = Number(record.totalPricePayment) || 0;
                    if (amount === 0)
                        continue;
                    if (!yearsList.includes(reportYear))
                        continue;
                    if (!customerMap.has(customer.customerId)) {
                        const initialYears = {};
                        for (const y of yearsList)
                            initialYears[y] = createEmptyYear();
                        customerMap.set(customer.customerId, {
                            customerId: customer.customerId,
                            customerName: customer.customerName,
                            currentDebt: 0,
                            years: initialYears,
                            grandTotal: 0,
                        });
                    }
                    const customerRow = customerMap.get(customer.customerId);
                    customerRow.years[reportYear].months[reportMonth] += amount;
                }
                // Gán dư nợ, làm tròn từng tháng và tính tổng cho từng khách
                const allDetails = Array.from(customerMap.values()).map((customer) => {
                    let customerGrandTotal = 0;
                    // Gán dư nợ hiện tại từ debtMap
                    customer.currentDebt = roundInt(debtMap.get(customer.customerId) || 0);
                    for (const y of yearsList) {
                        let yearTotal = 0;
                        for (let m = 1; m <= 12; m++) {
                            const roundedVal = roundInt(customer.years[y].months[m]);
                            customer.years[y].months[m] = roundedVal;
                            yearTotal += roundedVal;
                        }
                        customer.years[y].yearTotal = yearTotal;
                        customerGrandTotal += yearTotal;
                    }
                    customer.grandTotal = customerGrandTotal;
                    return customer;
                });
                // Khởi tạo và tính toán Footer chân trang từ allDetails đã làm tròn
                const summaryYears = {};
                for (const y of yearsList)
                    summaryYears[y] = createEmptyYear();
                let summaryGrandTotal = 0;
                for (const y of yearsList) {
                    let yearSum = 0;
                    for (let m = 1; m <= 12; m++) {
                        const monthSum = allDetails.reduce((sum, c) => sum + c.years[y].months[m], 0);
                        summaryYears[y].months[m] = monthSum;
                        yearSum += monthSum;
                    }
                    summaryYears[y].yearTotal = yearSum;
                    summaryGrandTotal += yearSum;
                }
                // Tổng nợ của các khách hàng có phát sinh doanh số trong danh sách
                const totalCurrentDebt = allDetails.reduce((sum, c) => sum + c.currentDebt, 0);
                // Sắp xếp ưu tiên khách có tổng doanh số lớn nhất lên đầu
                allDetails.sort((a, b) => b.grandTotal - a.grandTotal);
                fullReportData = {
                    summary: { years: summaryYears, grandTotal: summaryGrandTotal, totalCurrentDebt },
                    allDetails,
                    yearsList,
                };
                await redis_connect_1.default.set(cacheKey, JSON.stringify(fullReportData), "EX", CACHETTL);
            }
            // Lọc theo tên khách hàng & Tính lại Summary tương ứng
            let filteredDetails = fullReportData.allDetails;
            let responseSummary = fullReportData.summary;
            if (keyword) {
                filteredDetails = fullReportData.allDetails.filter((item) => (0, normalizeVN_1.normalizeVN)(item.customerName).includes(keyword));
                // Tính lại footer của ma trận nhiều năm theo tập khách đã lọc
                const filteredSummaryYears = {};
                for (const y of fullReportData.yearsList) {
                    filteredSummaryYears[y] = createEmptyYear();
                }
                let filteredGrandTotal = 0;
                for (const y of fullReportData.yearsList) {
                    let yearSum = 0;
                    for (let m = 1; m <= 12; m++) {
                        const monthSum = filteredDetails.reduce((sum, c) => sum + (c.years[y]?.months[m] || 0), 0);
                        filteredSummaryYears[y].months[m] = monthSum;
                        yearSum += monthSum;
                    }
                    filteredSummaryYears[y].yearTotal = yearSum;
                    filteredGrandTotal += yearSum;
                }
                const filteredTotalDebt = filteredDetails.reduce((sum, c) => sum + c.currentDebt, 0);
                responseSummary = {
                    years: filteredSummaryYears,
                    grandTotal: filteredGrandTotal,
                    totalCurrentDebt: filteredTotalDebt,
                };
            }
            // pagination
            const totalCustomers = filteredDetails.length;
            const totalPages = Math.ceil(totalCustomers / pageSize) || 1;
            const startIndex = (page - 1) * pageSize;
            const paginatedDetails = filteredDetails.slice(startIndex, startIndex + pageSize);
            return {
                message: isFromCache
                    ? "Data multi-year revenue from Redis"
                    : "Data multi-year revenue generated successfully",
                filter: { fromYear, toYear, userId: effectiveUserId },
                years: fullReportData.yearsList,
                summary: responseSummary,
                data: paginatedDetails,
                totalCustomers,
                totalPages,
                currentPage: page,
                pageSize,
            };
        }
        catch (error) {
            console.error("Error getting multi-year revenue report:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
};
// ===============================HELPER FUNCTIONS========================================
const aggregateDailyAmounts = (records, getDateFn, getAmountFn) => {
    const map = new Map();
    for (const item of records) {
        const rawDate = getDateFn(item);
        if (!rawDate)
            continue;
        // 1. Lấy epoch time (tránh khởi tạo Date mới nếu Sequelize đã trả về sẵn Date object)
        const timestamp = rawDate instanceof Date ? rawDate.getTime() : new Date(rawDate).getTime();
        if (Number.isNaN(timestamp))
            continue;
        // 2. Dịch sang UTC+7 và cắt chuỗi 'YYYY-MM-DD'
        const dateKey = new Date(timestamp + VN_TIMEZONE_OFFSET_MS).toISOString().slice(0, 10);
        // 3. Gom dồn số tiền
        const amount = Number(getAmountFn(item)) || 0;
        map.set(dateKey, (map.get(dateKey) || 0) + amount);
    }
    return map;
};
const toVNDate = (rawDate) => {
    if (!rawDate)
        return null;
    const timestamp = rawDate instanceof Date ? rawDate.getTime() : new Date(rawDate).getTime();
    if (Number.isNaN(timestamp))
        return null;
    return new Date(timestamp + VN_TIMEZONE_OFFSET_MS);
};
// Helper tạo khung 12 tháng trắng
const createEmptyYear = () => {
    const months = {};
    for (let m = 1; m <= 12; m++)
        months[m] = 0;
    return { months, yearTotal: 0 };
};
const roundInt = (val) => Math.round(Number(val) || 0);
//# sourceMappingURL=revenueService.js.map