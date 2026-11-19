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
const debtRepository_1 = require("../../../repository/debt/debtRepository");
const normalizeVN_1 = require("../../../utils/helper/normalizeVN");
const revenueHelper_1 = require("../../../utils/helper/modelHelper/revenueHelper");
const productionRevenueRule_1 = require("../../../utils/helper/modelHelper/productionRevenueRule");
const dayjs_config_1 = require("../../../assets/configs/dayjs/dayjs.config");
const normalizeAggDateKey = (value) => value instanceof Date
    ? (0, dayjs_config_1.dayjsUtc)(value).tz(dayjs_config_1.VN_TZ).format("YYYY-MM-DD")
    : String(value).slice(0, 10);
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
                    const amount = (0, revenueHelper_1.roundInt)(record.totalPriceOrder);
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
        const nowVn = dayjs_config_1.dayjsUtc.tz(new Date(), dayjs_config_1.VN_TZ);
        const currentYear = nowVn.year();
        const year = dto.year || currentYear;
        const month = dto.month;
        try {
            // Phân quyền
            const effectiveUserId = (0, revenueHelper_1.reportEffectiveUserId)(dto.currentUser, dto.targetUserId, dto.all);
            const cacheKey = reports.revenue_monthly(year, month, effectiveUserId ?? "all");
            const cached = await redis_connect_1.default.get(cacheKey);
            if (cached) {
                if (devEnvironment)
                    console.log("✅ Data Revenue monthly from Redis");
                const cachedData = JSON.parse(cached);
                return { ...cachedData, message: "Data Revenue monthly from Redis" };
            }
            // =============== Xác định biên thời gian ==============
            const paddedMonth = String(month).padStart(2, "0");
            const startOfMonth = dayjs_config_1.dayjsUtc.tz(`${year}-${paddedMonth}-01`, dayjs_config_1.VN_TZ);
            const daysInMonth = startOfMonth.daysInMonth(); // Đảm bảo luôn có biến cho vòng lặp phía dưới
            // Biên thời gian thông thường: 00:00:00 ngày 01 -> 23:59:59 ngày cuối tháng
            const startDate = startOfMonth.startOf("month").format("YYYY-MM-DD 00:00:00");
            const endDate = startOfMonth.endOf("month").format("YYYY-MM-DD 23:59:59");
            // Biên ca sản xuất (giấy tấm & nhập kho thùng): 06:00:00 ngày 01 -> 05:59:59 ngày 01 tháng kế tiếp
            const nextMonth = startOfMonth.add(1, "month");
            const productionStartDate = `${year}-${paddedMonth}-01 06:00:00`;
            const productionEndMoment = nextMonth.startOf("month").hour(5).minute(59).second(59);
            const productionEndDate = productionEndMoment.format("YYYY-MM-DD HH:mm:ss");
            const isClosedMonth = nowVn.isAfter(productionEndMoment);
            // Chạy 4 query gom nhóm song song (group ngay tại DB bằng Sequelize)
            const [ordersData, paperProdData, boxProdData, outboundData] = await Promise.all([
                synthetic_reportRepository_1.syntheticReportRepository.getDailyApprovedOrders({
                    startDate,
                    endDate,
                    userId: effectiveUserId ?? undefined,
                }),
                synthetic_reportRepository_1.syntheticReportRepository.getDailyPaperProduction({
                    startDate: productionStartDate,
                    endDate: productionEndDate,
                    userId: effectiveUserId ?? undefined,
                }),
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
            // === Gom nhóm thành Map ===
            const orderMap = new Map();
            for (const row of ordersData) {
                const key = normalizeAggDateKey(row.dateKey);
                orderMap.set(key, (orderMap.get(key) || 0) + Number(row.totalAmount || 0));
            }
            // Công đoạn 1 (giấy tấm): 100% đơn giấy tấm + 80% đơn làm thùng
            const paperProdMap = new Map();
            for (const row of paperProdData) {
                const key = (0, revenueHelper_1.getPaperShiftDate)(row.dayReport);
                const amount = (0, productionRevenueRule_1.calcPaperStageRevenue)({
                    rawTotalPrice: row.totalPrice,
                    isBox: row.PlanningPaper?.Order?.isBox,
                    qtyProduced: row.qtyProduced,
                    runningPlan: row.PlanningPaper?.runningPlan,
                    orderTotalPrice: row.PlanningPaper?.Order?.totalPrice,
                });
                paperProdMap.set(key, (paperProdMap.get(key) || 0) + amount);
            }
            // Công đoạn 2 (nhập kho thùng thành phẩm): 20% đơn làm thùng
            const boxProdMap = new Map();
            for (const row of boxProdData) {
                const key = (0, revenueHelper_1.getPaperShiftDate)(row.dateInbound);
                const amount = (0, productionRevenueRule_1.calcBoxInboundStageRevenue)(row.totalPrice);
                boxProdMap.set(key, (boxProdMap.get(key) || 0) + amount);
            }
            // Doanh số bán hàng / xuất kho
            const salesBeforeVatMap = new Map();
            const salesVatMap = new Map();
            const salesMap = new Map();
            for (const row of outboundData) {
                const key = normalizeAggDateKey(row.dateKey);
                salesBeforeVatMap.set(key, (salesBeforeVatMap.get(key) || 0) + Number(row.totalBeforeVat || 0));
                salesVatMap.set(key, (salesVatMap.get(key) || 0) + Number(row.totalVat || 0));
                salesMap.set(key, (salesMap.get(key) || 0) + Number(row.totalPayment || 0));
            }
            // Khởi tạo danh sách đủ các ngày trong tháng
            const details = [];
            const summary = {
                totalOrderApproved: 0,
                totalPaperProduction: 0,
                totalBoxProduction: 0,
                totalProduction: 0,
                totalBeforeVat: 0,
                totalVat: 0,
                totalSales: 0,
                totalReturn: 0,
            };
            for (let day = 1; day <= daysInMonth; day++) {
                const paddedDay = String(day).padStart(2, "0");
                const dateKey = `${year}-${paddedMonth}-${paddedDay}`;
                const orderAmount = (0, revenueHelper_1.roundInt)(orderMap.get(dateKey) || 0);
                const paperAmount = (0, revenueHelper_1.roundInt)(paperProdMap.get(dateKey) || 0);
                const boxAmount = (0, revenueHelper_1.roundInt)(boxProdMap.get(dateKey) || 0);
                const prodAmount = paperAmount + boxAmount;
                const totalBeforeVat = (0, revenueHelper_1.roundInt)(salesBeforeVatMap.get(dateKey) || 0);
                const totalVat = (0, revenueHelper_1.roundInt)(salesVatMap.get(dateKey) || 0);
                const saleAmount = (0, revenueHelper_1.roundInt)(salesMap.get(dateKey) || 0);
                const returnAmount = 0;
                details.push({
                    date: dateKey,
                    orderApprovedAmount: orderAmount,
                    paperProductionAmount: paperAmount,
                    boxProductionAmount: boxAmount,
                    productionAmount: prodAmount,
                    totalBeforeVat,
                    totalVat,
                    salesAmount: saleAmount,
                    returnAmount,
                });
                summary.totalOrderApproved += orderAmount;
                summary.totalPaperProduction += paperAmount;
                summary.totalBoxProduction += boxAmount;
                summary.totalProduction += prodAmount;
                summary.totalBeforeVat += totalBeforeVat;
                summary.totalVat += totalVat;
                summary.totalSales += saleAmount;
            }
            const reportData = {
                message: "Data Revenue monthly generated successfully",
                summary,
                data: details,
            };
            await redis_connect_1.default.set(cacheKey, JSON.stringify(reportData), "EX", isClosedMonth ? TIMETTL : CACHETTL);
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
                    const amount = (0, revenueHelper_1.roundInt)(record.totalPriceOrder);
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