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
const revenueHelper_1 = require("../../../utils/helper/modelHelper/revenueHelper");
const dayjs_config_1 = require("../../../assets/configs/dayjs/dayjs.config");
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
            const effectiveUserId = (0, revenueHelper_1.reportEffectiveUserId)(dto.currentUser, dto.targetUserId, dto.all);
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
                    const amount = (0, revenueHelper_1.roundInt)(record.totalPricePayment);
                    const debt = (0, revenueHelper_1.roundInt)(record.remainingAmount);
                    if (amount === 0 && debt === 0)
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
                const allDetails = Array.from(customerMap.values()).map((row) => {
                    return {
                        customerId: row.customerId,
                        customerName: row.customerName,
                        dailyAmounts: row.dailyAmounts,
                        totalCustomerSales: row.totalCustomerSales,
                        totalCustomerDebt: row.totalCustomerDebt,
                    };
                });
                // Làm tròn footer và tính tổng từ allDetails
                let totalMonthSales = 0;
                for (let d = 1; d <= daysInMonth; d++) {
                    const daySum = allDetails.reduce((sum, r) => sum + r.dailyAmounts[d], 0);
                    dailyTotals[d] = daySum;
                    totalMonthSales += daySum;
                }
                const totalMonthDebt = allDetails.reduce((sum, r) => sum + r.totalCustomerDebt, 0);
                // Sắp xếp khách theo tổng doanh số giảm dần
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
                let filteredTotalMonthSales = 0;
                for (let d = 1; d <= fullReportData.daysInMonth; d++) {
                    const daySum = filteredDetails.reduce((sum, item) => sum + (item.dailyAmounts[d] || 0), 0);
                    filteredDailyTotals[d] = daySum;
                    filteredTotalMonthSales += daySum;
                }
                responseSummary = {
                    totalMonthSales: filteredTotalMonthSales,
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
            const effectiveUserId = (0, revenueHelper_1.reportEffectiveUserId)(dto.currentUser, dto.targetUserId, dto.all);
            // Kiểm tra xem tháng được chọn có phải là tháng cũ không
            const cacheKey = reports.revenue_monthly(year, month, effectiveUserId ?? "all");
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
            // =============== Xác định biên thời gian ==============
            const paddedMonth = String(month).padStart(2, "0");
            const startOfMonth = (0, dayjs_config_1.dayjsUtc)(`${year}-${paddedMonth}-01`);
            const daysInMonth = startOfMonth.daysInMonth(); // Đảm bảo luôn có biến cho vòng lặp phía dưới
            // Biên thời gian thông thường: 00:00:00 ngày 01 -> 23:59:59 ngày cuối tháng
            const startDate = startOfMonth.startOf("month").format("YYYY-MM-DD 00:00:00");
            const endDate = startOfMonth.endOf("month").format("YYYY-MM-DD 23:59:59");
            // Biên ca sản xuất giấy: 06:00:00 ngày 01 -> 05:59:59 ngày 01 tháng kế tiếp
            const productionStartDate = `${year}-${paddedMonth}-01 06:00:00`;
            const nextMonth = startOfMonth.add(1, "month");
            const productionEndDate = `${nextMonth.format("YYYY-MM")}-01 05:59:59`;
            // Chạy 3 query gom nhóm song song
            const [ordersData, paperProdData, boxProdData, outboundData] = await Promise.all([
                synthetic_reportRepository_1.syntheticReportRepository.getDailyApprovedOrders({
                    startDate,
                    endDate,
                    userId: effectiveUserId ?? undefined,
                }),
                // Sản xuất giấy tấm: lọc theo ca 6h
                synthetic_reportRepository_1.syntheticReportRepository.getDailyPaperProduction({
                    startDate: productionStartDate,
                    endDate: productionEndDate,
                    userId: effectiveUserId ?? undefined,
                }),
                // Sản xuất thùng carton: lọc theo ca 6h
                synthetic_reportRepository_1.syntheticReportRepository.getDailyBoxProductionInbound({
                    startDate: productionStartDate,
                    endDate: productionEndDate,
                    userId: effectiveUserId ?? undefined,
                }),
                synthetic_reportRepository_1.syntheticReportRepository.getDailyProductionOutbound({
                    startDate,
                    endDate,
                    userId: effectiveUserId ?? undefined,
                }),
            ]);
            // Lọc bỏ đơn trùng lặp cùng 1 orderId, chỉ lấy đơn được duyệt mới nhất
            const uniqueOrdersMap = new Map();
            for (const row of ordersData) {
                if (!uniqueOrdersMap.has(row.orderId)) {
                    uniqueOrdersMap.set(row.orderId, row);
                }
            }
            const cleanOrdersData = Array.from(uniqueOrdersMap.values());
            // === Gom nhóm thành Map ===
            // Doanh số nhận đơn theo ngày duyệt dayApproved
            const orderMap = (0, revenueHelper_1.aggregateDailyAmounts)({
                records: cleanOrdersData,
                getDateFn: (item) => item.dayApproved,
                getAmountFn: (item) => item.totalPrice,
                timezone: VN_TIMEZONE_OFFSET_MS,
            });
            // Doanh số sản xuất giấy tấm theo ngày chạy máy
            const paperProdMap = (0, revenueHelper_1.aggregateDailyAmounts)({
                records: paperProdData,
                getDateFn: (item) => (0, dayjs_config_1.dayjsUtc)(item.dayReport).subtract(6, "hour").toDate(),
                getAmountFn: (item) => item.totalPrice,
                timezone: VN_TIMEZONE_OFFSET_MS,
            });
            // Doanh số sản xuất thùng theo ngày nhập kho
            const boxProdMap = (0, revenueHelper_1.aggregateDailyAmounts)({
                records: boxProdData,
                getDateFn: (item) => (0, dayjs_config_1.dayjsUtc)(item.dateInbound).subtract(6, "hour").toDate(),
                getAmountFn: (item) => item.totalPrice,
                timezone: VN_TIMEZONE_OFFSET_MS,
            });
            // Doanh số bán hàng / xuất kho
            const salesMap = (0, revenueHelper_1.aggregateDailyAmounts)({
                records: outboundData,
                getDateFn: (item) => item.dateOutbound,
                getAmountFn: (item) => item.totalPricePayment,
                timezone: VN_TIMEZONE_OFFSET_MS,
            });
            // Khởi tạo danh sách đủ các ngày trong tháng
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
                const orderAmount = (0, revenueHelper_1.roundInt)(orderMap.get(dateKey) || 0);
                // Doanh số sản xuất = Giấy tấm (Report) + Thùng carton (Inbound)
                const paperAmount = (0, revenueHelper_1.roundInt)(paperProdMap.get(dateKey) || 0);
                const boxAmount = (0, revenueHelper_1.roundInt)(boxProdMap.get(dateKey) || 0);
                const prodAmount = paperAmount + boxAmount;
                const saleAmount = (0, revenueHelper_1.roundInt)(salesMap.get(dateKey) || 0);
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
            const effectiveUserId = (0, revenueHelper_1.reportEffectiveUserId)(dto.currentUser, dto.targetUserId, dto.all);
            // Caching
            const isPastYears = toYear < currentYear;
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
                    const custId = String(pxk.customerId);
                    const remaining = (0, revenueHelper_1.roundInt)(pxk.remainingAmount);
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
                    const custId = String(customer.customerId);
                    const vnDate = (0, revenueHelper_1.toVNDate)(record.dateOutbound, VN_TIMEZONE_OFFSET_MS);
                    if (!vnDate)
                        continue;
                    const reportYear = vnDate.getUTCFullYear();
                    const reportMonth = vnDate.getUTCMonth() + 1;
                    const amount = (0, revenueHelper_1.roundInt)(record.totalPricePayment);
                    if (amount === 0)
                        continue;
                    if (!yearsList.includes(reportYear))
                        continue;
                    if (!customerMap.has(custId)) {
                        const initialYears = {};
                        for (const y of yearsList)
                            initialYears[y] = (0, revenueHelper_1.createEmptyYear)();
                        customerMap.set(custId, {
                            customerId: custId,
                            customerName: customer.customerName,
                            currentDebt: 0,
                            years: initialYears,
                            grandTotal: 0,
                        });
                    }
                    const customerRow = customerMap.get(custId);
                    customerRow.years[reportYear].months[reportMonth] += amount;
                }
                // Gán dư nợ, làm tròn từng tháng và tính tổng cho từng khách
                const allDetails = Array.from(customerMap.values()).map((customer) => {
                    let customerGrandTotal = 0;
                    customer.currentDebt = (0, revenueHelper_1.roundInt)(debtMap.get(customer.customerId) || 0);
                    for (const y of yearsList) {
                        let yearTotal = 0;
                        for (let m = 1; m <= 12; m++) {
                            const roundedVal = (0, revenueHelper_1.roundInt)(customer.years[y].months[m]);
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
                    summaryYears[y] = (0, revenueHelper_1.createEmptyYear)();
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
                allDetails.sort((a, b) => b.grandTotal - a.grandTotal);
                fullReportData = {
                    summary: { years: summaryYears, grandTotal: summaryGrandTotal, totalCurrentDebt },
                    allDetails,
                    yearsList,
                };
                if (isPastYears) {
                    await redis_connect_1.default.set(cacheKey, JSON.stringify(fullReportData), "EX", CACHETTL);
                }
            }
            // Lọc theo tên khách hàng & Tính lại Summary tương ứng
            let filteredDetails = fullReportData.allDetails;
            let responseSummary = fullReportData.summary;
            if (keyword) {
                filteredDetails = fullReportData.allDetails.filter((item) => (0, normalizeVN_1.normalizeVN)(item.customerName).includes(keyword));
                const filteredSummaryYears = {};
                for (const y of fullReportData.yearsList)
                    filteredSummaryYears[y] = (0, revenueHelper_1.createEmptyYear)();
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
                responseSummary = {
                    years: filteredSummaryYears,
                    grandTotal: filteredGrandTotal,
                    totalCurrentDebt: filteredDetails.reduce((sum, c) => sum + c.currentDebt, 0),
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
//# sourceMappingURL=revenueService.js.map