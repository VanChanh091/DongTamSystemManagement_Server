"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.debtManagementService = void 0;
const xlsx = __importStar(require("xlsx"));
const exceljs_1 = __importDefault(require("exceljs"));
const appError_1 = require("../../utils/appError");
const debtRepository_1 = require("../../repository/debtRepository");
const dayjs_config_1 = require("../../assets/configs/dayjs/dayjs.config");
const excelExporter_1 = require("../../utils/helper/excelExporter");
const transactionHelper_1 = require("../../utils/helper/transactionHelper");
const paymentAllocation_1 = require("../../models/warehouse/payment/paymentAllocation");
const debtCustomerRowAndColumn_1 = require("../../utils/mapping/warehouse/debtCustomerRowAndColumn");
exports.debtManagementService = {
    //================================DEBT CLOSING=================================
    getCustomerDebtSummary: async ({ page, pageSize, userId, targetDate, search, }) => {
        try {
            //Kéo toàn bộ PXK chưa thanh toán từ DB
            const unpaidOutbounds = await debtRepository_1.debtRepository.findOutboundUnpaid({
                userId,
                targetDate,
                search,
            });
            // Gom nhóm và tính toán Grand Total cho TOÀN BỘ hệ thống
            const { sortedCustomers, grandTotal } = processDebtAggregation(unpaidOutbounds, targetDate);
            // Phân trang chỉ cho mảng dữ liệu hiển thị (data)
            const totalCustomers = sortedCustomers.length;
            const totalPages = Math.ceil(totalCustomers / pageSize) || 1;
            const startIndex = (page - 1) * pageSize;
            const paginatedItems = sortedCustomers.slice(startIndex, startIndex + pageSize);
            return {
                message: "Lấy danh sách công nợ thành công",
                targetDate: targetDate || new Date().toISOString(),
                data: paginatedItems.map(mapToDebtItemDTO),
                grandTotal: mapToDebtItemDTO(grandTotal),
                totalCustomers,
                totalPages,
                currentPage: page,
            };
        }
        catch (error) {
            console.error("Error in getCustomerDebtSummary:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    // hàm này chỉ check termPaymentDays của khách hàng, không check closingDays
    closeDebtForSingleCustomer: async ({ customerId, closingDate = new Date(), }) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                let termDays;
                if (termDays === undefined) {
                    const config = await debtRepository_1.debtRepository.findOneCustomerPayment(customerId, transaction);
                    if (!config) {
                        throw appError_1.AppError.NotFound("Chưa cấu hình công nợ cho khách hàng này", "DEBT_CONFIG_NOT_FOUND");
                    }
                    termDays = config.paymentTermDays;
                }
                // Đưa closingDate về mốc cuối ngày 23:59:59.999
                const effectiveClosingDate = (0, dayjs_config_1.dayjsUtc)(closingDate).endOf("day").toDate();
                // Tính hạn thanh toán (dueDate)
                const dueDate = (0, dayjs_config_1.dayjsUtc)(effectiveClosingDate)
                    .add(Number(termDays) || 0, "day")
                    .endOf("day")
                    .toDate();
                // Tìm tất cả các Phiếu Xuất Kho (PXK) <= closingDate chưa được chưa chốt
                const [updatedCount] = await debtRepository_1.debtRepository.updateDueDateForOutbound({
                    dueDate,
                    customerId,
                    closingDate: effectiveClosingDate,
                    transaction,
                });
                if (updatedCount === 0) {
                    return {
                        customerId,
                        closedCount: 0,
                        message: "Không có đơn hàng mới nào cần chốt trong kỳ này",
                    };
                }
                return {
                    customerId,
                    closedCount: updatedCount,
                    dueDateCalculated: (0, dayjs_config_1.dayjsUtc)(dueDate).format("YYYY-MM-DD HH:mm:ss"),
                };
            });
        }
        catch (error) {
            console.error("Error occurred while closing debt for single customer:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    processAutoDebtClosing: async (targetDate = new Date()) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const closingDate = (0, dayjs_config_1.dayjsUtc)(targetDate).endOf("day").toDate();
                const formattedDate = (0, dayjs_config_1.dayjsUtc)(closingDate).format("YYYY-MM-DD HH:mm:ss");
                // Lấy toàn bộ cấu hình công nợ của khách hàng
                const configs = await debtRepository_1.debtRepository.findAllRawCustomerPayment();
                const dueDateGroups = new Map();
                for (const config of configs) {
                    const isClosing = checkIsClosingDay({
                        paymentType: config.paymentType,
                        closingDays: config.closingDays,
                        targetDate: closingDate,
                    });
                    if (isClosing) {
                        const calculatedDueDate = (0, dayjs_config_1.dayjsUtc)(closingDate)
                            .add(Number(config.paymentTermDays) || 0, "day")
                            .endOf("day")
                            .toDate();
                        const key = calculatedDueDate.toISOString();
                        if (!dueDateGroups.has(key)) {
                            dueDateGroups.set(key, { dueDate: calculatedDueDate, customerIds: [] });
                        }
                        dueDateGroups.get(key).customerIds.push(config.customerId);
                    }
                }
                if (dueDateGroups.size === 0) {
                    return {
                        message: "Không có khách hàng nào cần chốt nợ hôm nay",
                        processedAt: formattedDate,
                    };
                }
                let totalUpdatedCount = 0;
                for (const { dueDate, customerIds } of dueDateGroups.values()) {
                    const [updatedCount] = await debtRepository_1.debtRepository.updateDueDateForOutbound({
                        dueDate,
                        customerId: customerIds,
                        closingDate,
                        transaction,
                    });
                    totalUpdatedCount += updatedCount;
                }
                return {
                    message: "Chốt công nợ tự động thành công",
                    processedAt: formattedDate,
                    totalCustomersClosed: totalUpdatedCount,
                };
            });
        }
        catch (error) {
            console.error("Error in processAutoDebtClosing:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    exportCustomerDebtSummaryToExcel: async (res, targetDate) => {
        try {
            // 1. Kéo toàn bộ dữ liệu & chạy logic tổng hợp như getCustomerDebtSummary
            const unpaidOutbounds = await debtRepository_1.debtRepository.findOutboundUnpaid({ targetDate });
            const { sortedCustomers, grandTotal } = processDebtAggregation(unpaidOutbounds);
            const dateStr = (0, dayjs_config_1.dayjsUtc)(targetDate).format("DD-MM-YYYY");
            const fileName = `debt_customer_${dateStr}`;
            // 2. Cấu hình Header HTTP Response
            res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            res.setHeader("Content-Disposition", `attachment; filename=${fileName}.xlsx`);
            // 3. Khởi tạo Stream Workbook
            const workbook = new exceljs_1.default.stream.xlsx.WorkbookWriter({
                stream: res,
                useStyles: true,
            });
            const worksheet = workbook.addWorksheet("Tổng Hợp Công Nợ");
            // 4. Cấu hình các cột tương ứng với DebtItemDTO
            worksheet.columns = debtCustomerRowAndColumn_1.debtCustomerColumns;
            //header style
            (0, excelExporter_1.styleHeaderStream)(worksheet);
            const cellBorder = {
                top: { style: "thin" },
                left: { style: "thin" },
                bottom: { style: "thin" },
                right: { style: "thin" },
            };
            const cellFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F2F2" } };
            // 5. Ghi từng dòng Khách hàng
            const totalColumns = debtCustomerRowAndColumn_1.debtCustomerColumns.length;
            sortedCustomers.forEach((rawItem, index) => {
                const item = mapToDebtItemDTO(rawItem);
                const rowData = (0, debtCustomerRowAndColumn_1.mappingDebtCustomerRow)(item, index);
                const excelRow = worksheet.addRow(rowData);
                for (let i = 1; i <= totalColumns; i++) {
                    const cell = excelRow.getCell(i);
                    cell.border = cellBorder;
                    cell.fill = cellFill;
                }
                excelRow.commit();
            });
            // 6. Ghi dòng TỔNG CỘNG toàn hệ thống ở cuối file
            const grandItem = mapToDebtItemDTO(grandTotal);
            const grandRowData = {
                ...(0, debtCustomerRowAndColumn_1.mappingDebtCustomerRow)(grandItem, 0),
                index: "",
                customerId: "",
                customerName: "TỔNG CỘNG",
            };
            const totalRow = worksheet.addRow(grandRowData);
            totalRow.font = { bold: true };
            for (let i = 1; i <= totalColumns; i++) {
                const cell = totalRow.getCell(i);
                cell.border = cellBorder;
                cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "FFF2F2F2" },
                };
            }
            totalRow.commit();
            // 7. Đóng stream hoàn tất file
            worksheet.commit();
            await workbook.commit();
        }
        catch (error) {
            console.error("Export Debt Excel error:", error);
            if (!res.headersSent) {
                res.status(500).send("Lỗi trong quá trình xuất file");
            }
        }
    },
    //================================PAYMENT DEBT=================================
    paymentDebtByCustomerId: async ({ customerId, amount, paymentMethod, outboundSlipCodes, }) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                if (amount <= 0)
                    throw appError_1.AppError.BadRequest("Số tiền phải lớn hơn 0");
                // lấy danh sách PXK chưa thanh toán của khách hàng
                const outbounds = await debtRepository_1.debtRepository.findOutboundUnpaid({
                    customerId,
                    transaction,
                    lock: transaction.LOCK.UPDATE,
                    includeCustomer: false,
                });
                const updatedOutboundMap = new Map();
                const allocationsToCreate = [];
                // gọi core engine để xử lý cấn trừ công nợ
                const excessAmount = coreCustomerPayment({
                    amount,
                    paymentMethod,
                    outboundSlipCodes,
                    customerOutbounds: outbounds,
                    updatedOutboundMap,
                    allocationsToCreate,
                });
                if (updatedOutboundMap.size > 0) {
                    const bulkUpdateData = Array.from(updatedOutboundMap.values()).map(({ outbound, paidAmount, remainingAmount }) => ({
                        ...outbound,
                        paidAmount,
                        remainingAmount,
                        status: remainingAmount === 0 ? "paid" : "partial",
                    }));
                    await debtRepository_1.debtRepository.bulkUpdateOutboundStatus(bulkUpdateData, transaction);
                }
                if (allocationsToCreate.length > 0) {
                    await debtRepository_1.debtRepository.bulkCreatePaymentAllocation(allocationsToCreate, transaction);
                }
                return {
                    message: `Cấn trừ cho khách hàng: ${customerId} thành công`,
                    totalPayment: round2(amount),
                    allocatedTotal: round2(amount - excessAmount),
                    excessAmount,
                };
            });
        }
        catch (error) {
            console.error("Error occurred while processing customer payment:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    importAmountPaymentFromExcel: async (fileBuffer) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const workbook = xlsx.read(fileBuffer, { type: "buffer" });
                const rawData = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
                if (!rawData || rawData.length === 0)
                    throw appError_1.AppError.BadRequest("File rỗng", "EMPTY_FILE");
                // Parse Excel sang array
                const parsedRows = parseExcelRows(rawData); // Hàm đọc Excel
                const uniqueCustomerIds = Array.from(new Set(parsedRows.map((r) => r.customerId)));
                // Lấy tất cả các PXK chưa thanh toán của các khách hàng
                const allOutbounds = await debtRepository_1.debtRepository.findOutboundUnpaid({
                    customerId: uniqueCustomerIds,
                    transaction,
                    lock: transaction.LOCK.UPDATE,
                    includeCustomer: false,
                });
                // Group theo CustomerId
                const customerOutboundsMap = new Map();
                for (const ob of allOutbounds) {
                    const list = customerOutboundsMap.get(ob.customerId) || [];
                    list.push(ob);
                    customerOutboundsMap.set(ob.customerId, list);
                }
                const updatedOutboundMap = new Map();
                const allocationsToCreate = [];
                let totalAllocated = 0;
                for (const row of parsedRows) {
                    const customerOutbounds = customerOutboundsMap.get(row.customerId) || [];
                    const excess = coreCustomerPayment({
                        amount: row.amount,
                        paymentMethod: row.paymentMethod,
                        outboundSlipCodes: undefined,
                        customerOutbounds,
                        updatedOutboundMap,
                        allocationsToCreate,
                    });
                    totalAllocated += round2(row.amount - excess);
                }
                if (updatedOutboundMap.size > 0) {
                    const bulkUpdateData = Array.from(updatedOutboundMap.values()).map(({ outbound, paidAmount, remainingAmount }) => ({
                        ...outbound,
                        paidAmount,
                        remainingAmount,
                        status: remainingAmount === 0 ? "paid" : "partial",
                    }));
                    await debtRepository_1.debtRepository.bulkUpdateOutboundStatus(bulkUpdateData, transaction);
                }
                if (allocationsToCreate.length > 0) {
                    await debtRepository_1.debtRepository.bulkCreatePaymentAllocation(allocationsToCreate, transaction);
                }
                return {
                    message: "Import thành công",
                    totalProcessedRows: parsedRows.length,
                    totalAllocatedAmount: totalAllocated,
                };
            });
        }
        catch (error) {
            console.error("Error occurred while importing payment amounts from Excel:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
    writeOffDebt: async (outboundSlipCode) => {
        try {
            return await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                const outbound = await debtRepository_1.debtRepository.findOutboundById({
                    outboundSlipCode,
                    options: {
                        transaction,
                        lock: transaction.LOCK.UPDATE,
                    },
                });
                if (!outbound) {
                    throw appError_1.AppError.BadRequest("PXK không tồn tại hoặc đã được thanh toán hết", "OUTBOUND_NOT_FOUND");
                }
                const remaining = Number(outbound.remainingAmount || 0);
                await outbound.update({ remainingAmount: 0, status: "paid", writeOffAmount: remaining }, { transaction });
                await paymentAllocation_1.PaymentAllocation.create({ outboundId: outbound.outboundId, amountAllocation: remaining }, { transaction });
                return { message: "Xóa nợ phiếu xuất kho thành công", writtenOffAmount: remaining };
            });
        }
        catch (error) {
            console.error("Error occurred while writing off debt:", error);
            if (error instanceof appError_1.AppError)
                throw error;
            throw appError_1.AppError.ServerError();
        }
    },
};
//==============================HELPER=================================
const round2 = (val) => Math.round((val + Number.EPSILON) * 100) / 100;
const roundInt = (val) => Math.round(Number(val) || 0);
const mapToDebtItemDTO = (rawItem) => {
    const aging = rawItem.aging;
    // phân loại theo chốt kỳ hạn: closedDebt + closedDebt
    // phân loại theo hạn thanh toán: overdueDebt + notDueDebt
    return {
        customerId: rawItem.customerId || "",
        customerName: rawItem.customerName || "",
        companyName: rawItem.companyName || "",
        totalDebt: roundInt(rawItem.totalDebt),
        closedDebt: roundInt(rawItem.closedDebt),
        currentPeriodDebt: roundInt(rawItem.currentPeriodDebt),
        overdueDebt: roundInt(rawItem.dueDebt),
        notDueDebt: roundInt(rawItem.notDueDebt),
        unpaidOutboundCount: rawItem.unpaidOutboundCount || 0,
        aging: {
            dueIn1_3: roundInt(aging?.dueIn1_3),
            overdue1_30: roundInt(aging?.overdue1_30),
            overdue31_60: roundInt(aging?.overdue31_60),
            overdue61_90: roundInt(aging?.overdue61_90),
            overdue91_120: roundInt(aging?.overdue91_120),
            overdueOver120: roundInt(aging?.overdueOver120),
        },
    };
};
// Helper tính toán công nợ và gom nhóm từ danh sách PXK
const processDebtAggregation = (unpaidOutbounds, targetDate) => {
    const baseDate = targetDate ? new Date(targetDate) : new Date();
    baseDate.setHours(0, 0, 0, 0);
    const customerMap = new Map();
    const grandTotal = {
        customerId: "",
        customerName: "TỔNG CỘNG",
        totalDebt: 0,
        closedDebt: 0,
        currentPeriodDebt: 0,
        dueDebt: 0,
        notDueDebt: 0,
        unpaidOutboundCount: unpaidOutbounds.length,
        aging: {
            dueIn1_3: 0,
            overdue1_30: 0,
            overdue31_60: 0,
            overdue61_90: 0,
            overdue91_120: 0,
            overdueOver120: 0,
        },
    };
    for (const pxk of unpaidOutbounds) {
        const remaining = Number(pxk.remainingAmount || 0);
        const custId = pxk.customerId;
        if (!customerMap.has(custId)) {
            customerMap.set(custId, {
                customerId: custId,
                customerName: pxk.Customer?.customerName || "",
                companyName: pxk.Customer?.companyName || "",
                totalDebt: 0,
                closedDebt: 0,
                currentPeriodDebt: 0,
                dueDebt: 0,
                notDueDebt: 0,
                unpaidOutboundCount: 0,
                aging: {
                    dueIn1_3: 0,
                    overdue1_30: 0,
                    overdue31_60: 0,
                    overdue61_90: 0,
                    overdue91_120: 0,
                    overdueOver120: 0,
                },
            });
        }
        const summary = customerMap.get(custId);
        summary.totalDebt += remaining;
        summary.unpaidOutboundCount += 1;
        grandTotal.totalDebt += remaining;
        if (pxk.dueDate) {
            summary.closedDebt += remaining;
            grandTotal.closedDebt += remaining;
            const dueDate = new Date(pxk.dueDate);
            dueDate.setHours(0, 0, 0, 0);
            const diffTime = dueDate.getTime() - baseDate.getTime();
            const daysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (daysUntilDue >= 0) {
                // --- NỢ TRONG HẠN ---
                summary.notDueDebt += remaining;
                grandTotal.notDueDebt += remaining;
                if (daysUntilDue <= 3) {
                    summary.aging.dueIn1_3 += remaining;
                    grandTotal.aging.dueIn1_3 += remaining;
                }
            }
            else {
                // --- NỢ QUÁ HẠN (daysUntilDue < 0) ---
                const daysOverdue = Math.abs(daysUntilDue);
                summary.dueDebt += remaining;
                grandTotal.dueDebt += remaining;
                if (daysOverdue <= 30) {
                    summary.aging.overdue1_30 += remaining;
                    grandTotal.aging.overdue1_30 += remaining;
                }
                else if (daysOverdue <= 60) {
                    summary.aging.overdue31_60 += remaining;
                    grandTotal.aging.overdue31_60 += remaining;
                }
                else if (daysOverdue <= 90) {
                    summary.aging.overdue61_90 += remaining;
                    grandTotal.aging.overdue61_90 += remaining;
                }
                else if (daysOverdue <= 120) {
                    summary.aging.overdue91_120 += remaining;
                    grandTotal.aging.overdue91_120 += remaining;
                }
                else {
                    summary.aging.overdueOver120 += remaining;
                    grandTotal.aging.overdueOver120 += remaining;
                }
            }
        }
        else {
            // --- ĐƠN PHÁT SINH TRONG KỲ ---
            summary.currentPeriodDebt += remaining;
            summary.notDueDebt += remaining;
            grandTotal.currentPeriodDebt += remaining;
            grandTotal.notDueDebt += remaining;
        }
    }
    // Sắp xếp danh sách khách hàng theo độ ưu tiên thu hồi nợ
    const sortedCustomers = Array.from(customerMap.values()).sort((a, b) => {
        if (b.dueDebt !== a.dueDebt)
            return b.dueDebt - a.dueDebt;
        if (b.aging.dueIn1_3 !== a.aging.dueIn1_3)
            return b.aging.dueIn1_3 - a.aging.dueIn1_3;
        if (b.totalDebt !== a.totalDebt)
            return b.totalDebt - a.totalDebt;
        return a.customerName.localeCompare(b.customerName, "vi");
    });
    return { sortedCustomers, grandTotal };
};
//helper check ngày chốt công nợ
const checkIsClosingDay = ({ paymentType, closingDays, targetDate = new Date(), }) => {
    try {
        // tạo bản để tránh bị biến đổi đối tượng Date gốc
        const targetDayjs = (0, dayjs_config_1.dayjsUtc)(targetDate);
        const dayOfWeek = targetDayjs.day(); // 0: Chủ Nhật, 1 -> 6: T2 -> T7
        const dateOfMonth = targetDayjs.date();
        const lastDayOfMonth = targetDayjs.endOf("month").date();
        const safeClosingDays = (closingDays ?? []).map(Number);
        switch (paymentType) {
            case "daily":
                return true;
            case "weekly":
                // Quy ước Thứ trong tuần: T2=1, T3=2, ..., CN=0
                // Nếu không có ngày chốt nào được chỉ định, mặc định chốt vào Chủ nhật (0)
                return safeClosingDays.length > 0 ? safeClosingDays.includes(dayOfWeek) : dayOfWeek === 0;
            case "monthly":
            case "custom_days":
                // Nếu cấu hình monthly nhưng để trống ngày -> Mặc định chốt ngày cuối cùng của tháng
                if (safeClosingDays.length === 0) {
                    return paymentType === "monthly" && dateOfMonth === lastDayOfMonth;
                }
                // Chốt vào ngày được chỉ định
                if (safeClosingDays.includes(dateOfMonth))
                    return true;
                // Xử lý tháng thiếu ngày (VD: tháng 2 có 28 hoặc 29 ngày)
                const hasOverflowDay = safeClosingDays.some((day) => day >= lastDayOfMonth);
                if (hasOverflowDay && dateOfMonth === lastDayOfMonth) {
                    return true;
                }
                return false;
            default:
                return false;
        }
    }
    catch (error) {
        console.error("Error occurred while checking closing day:", error);
        return false;
    }
};
//helper payment debt
const coreCustomerPayment = ({ amount, paymentMethod, outboundSlipCodes, customerOutbounds, updatedOutboundMap, allocationsToCreate, }) => {
    let remainingPaymentPool = round2(amount);
    // cấn trừ công nợ theo PXK được chỉ định
    if (outboundSlipCodes && outboundSlipCodes.length > 0) {
        for (const slipCode of outboundSlipCodes) {
            if (remainingPaymentPool <= 0)
                break;
            const outbound = customerOutbounds.find((o) => o.outboundSlipCode === slipCode);
            if (!outbound) {
                throw appError_1.AppError.BadRequest(`Không tìm thấy PXK: ${slipCode}`, "OUTBOUND_NOT_FOUND");
            }
            const existedId = updatedOutboundMap.get(outbound.outboundId);
            const currentRemaining = existedId
                ? existedId.remainingAmount
                : Number(outbound.remainingAmount || 0);
            const currentPaid = existedId ? existedId.paidAmount : Number(outbound.paidAmount || 0);
            if (currentRemaining <= 0) {
                throw appError_1.AppError.BadRequest(`PXK: ${slipCode} đã được thanh toán hết`, "OUTBOUND_ALREADY_PAID");
            }
            const payAmount = round2(Math.min(currentRemaining, remainingPaymentPool));
            const newPaid = round2(currentPaid + payAmount);
            const newRemaining = Math.max(0, round2(currentRemaining - payAmount));
            updatedOutboundMap.set(outbound.outboundId, {
                outbound,
                paidAmount: newPaid,
                remainingAmount: newRemaining,
            });
            allocationsToCreate.push({
                outboundId: outbound.outboundId,
                amountAllocation: payAmount,
                paymentMethod,
            });
            remainingPaymentPool = Math.max(0, round2(remainingPaymentPool - payAmount));
        }
    }
    // cấn trừ công nợ từ file import (FIFO)
    if (remainingPaymentPool > 0) {
        for (const outbound of customerOutbounds) {
            if (remainingPaymentPool <= 0)
                break;
            const existedId = updatedOutboundMap.get(outbound.outboundId);
            const currentRemaining = existedId
                ? existedId.remainingAmount
                : Number(outbound.remainingAmount || 0);
            const currentPaid = existedId ? existedId.paidAmount : Number(outbound.paidAmount || 0);
            if (currentRemaining <= 0)
                continue;
            const payAmount = round2(Math.min(currentRemaining, remainingPaymentPool));
            const newPaid = round2(currentPaid + payAmount);
            const newRemaining = Math.max(0, round2(currentRemaining - payAmount));
            updatedOutboundMap.set(outbound.outboundId, {
                outbound,
                paidAmount: newPaid,
                remainingAmount: newRemaining,
            });
            allocationsToCreate.push({
                outboundId: outbound.outboundId,
                amountAllocation: payAmount,
                paymentMethod,
            });
            remainingPaymentPool = Math.max(0, round2(remainingPaymentPool - payAmount));
        }
    }
    return remainingPaymentPool;
};
const parseExcelRows = (rawData) => {
    return rawData.map((row, index) => {
        const rowNumber = index + 2; // Dòng 1 là tiêu đề, dữ liệu bắt đầu từ dòng 2
        const customerId = String(row["Mã Khách Hàng"] || "").trim();
        const amount = Number(row["Số tiền thu"] || 0);
        // Validate dữ liệu bắt buộc
        if (!customerId) {
            throw appError_1.AppError.BadRequest(`Dòng ${rowNumber}: Thiếu thông tin Mã khách hàng`, "INVALID_EXCEL_ROW");
        }
        if (isNaN(amount) || amount <= 0) {
            throw appError_1.AppError.BadRequest(`Dòng ${rowNumber} (Mã KH: ${customerId}): Số tiền cấn trừ phải lớn hơn 0`, "INVALID_EXCEL_ROW");
        }
        return {
            rowNumber,
            customerId,
            amount,
            paymentMethod: "IMPORT",
        };
    });
};
//# sourceMappingURL=debtManagementService.js.map