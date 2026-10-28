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
const normalizeVN_1 = require("../../utils/helper/normalizeVN");
const core_debt_helper_1 = require("../../utils/helper/core_debt_helper");
exports.debtManagementService = {
    //================================DEBT CLOSING=================================
    getCustomerDebtSummary: async ({ page, pageSize, userId, targetDate, search, }) => {
        try {
            //Kéo toàn bộ PXK chưa thanh toán từ DB
            const unpaidOutbounds = await debtRepository_1.debtRepository.findOutboundUnpaid({
                userId,
                targetDate,
            });
            // Gom nhóm và tính toán Grand Total cho TOÀN BỘ hệ thống
            const { sortedCustomers, grandTotal } = (0, core_debt_helper_1.processDebtAggregation)(unpaidOutbounds, targetDate);
            // Lọc khách hàng bằng hàm normalizeVN
            let filteredCustomers = sortedCustomers;
            let finalGrandTotal = grandTotal;
            if (search && search.trim()) {
                const keyword = (0, normalizeVN_1.normalizeVN)(search);
                filteredCustomers = sortedCustomers.filter((cust) => {
                    const nameMatch = (0, normalizeVN_1.normalizeVN)(cust.customerName).includes(keyword);
                    const companyMatch = (0, normalizeVN_1.normalizeVN)(cust.companyName).includes(keyword);
                    const idMatch = cust.customerId
                        ? cust.customerId.toString().toLowerCase().includes(keyword)
                        : false;
                    return nameMatch || companyMatch || idMatch;
                });
                finalGrandTotal = (0, core_debt_helper_1.calculateGrandTotalFromCustomers)(filteredCustomers);
            }
            // Phân trang chỉ cho mảng dữ liệu hiển thị (data)
            const totalCustomers = filteredCustomers.length;
            const totalPages = Math.ceil(totalCustomers / pageSize) || 1;
            const startIndex = (page - 1) * pageSize;
            const paginatedItems = filteredCustomers.slice(startIndex, startIndex + pageSize);
            return {
                message: "Lấy danh sách công nợ thành công",
                targetDate: targetDate || new Date().toISOString(),
                data: paginatedItems.map(core_debt_helper_1.mapToDebtItemDTO),
                grandTotal: (0, core_debt_helper_1.mapToDebtItemDTO)(finalGrandTotal),
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
                    const isClosing = (0, core_debt_helper_1.checkIsClosingDay)({
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
            const { sortedCustomers, grandTotal } = (0, core_debt_helper_1.processDebtAggregation)(unpaidOutbounds);
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
                const item = (0, core_debt_helper_1.mapToDebtItemDTO)(rawItem);
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
            const grandItem = (0, core_debt_helper_1.mapToDebtItemDTO)(grandTotal);
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
                const excessAmount = (0, core_debt_helper_1.coreCustomerPayment)({
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
                    totalPayment: (0, core_debt_helper_1.round2)(amount),
                    allocatedTotal: (0, core_debt_helper_1.round2)(amount - excessAmount),
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
                const parsedRows = (0, core_debt_helper_1.parseExcelRows)(rawData); // Hàm đọc Excel
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
                    const excess = (0, core_debt_helper_1.coreCustomerPayment)({
                        amount: row.amount,
                        paymentMethod: row.paymentMethod,
                        outboundSlipCodes: undefined,
                        customerOutbounds,
                        updatedOutboundMap,
                        allocationsToCreate,
                    });
                    totalAllocated += (0, core_debt_helper_1.round2)(row.amount - excess);
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
                await paymentAllocation_1.PaymentAllocation.create({
                    outboundId: outbound.outboundId,
                    amountAllocation: remaining,
                    customerId: outbound.customerId,
                }, { transaction });
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
//# sourceMappingURL=debtManagementService.js.map