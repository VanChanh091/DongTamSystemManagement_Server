"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseExcelRows = exports.coreCustomerPayment = exports.checkIsClosingDay = exports.processDebtAggregation = exports.calculateGrandTotalFromCustomers = exports.mapToDebtItemDTO = exports.roundInt = exports.round2 = void 0;
const dayjs_config_1 = require("../../assets/configs/dayjs/dayjs.config");
const appError_1 = require("../appError");
//==============================HELPER=================================
const round2 = (val) => Math.round((val + Number.EPSILON) * 100) / 100;
exports.round2 = round2;
const roundInt = (val) => Math.round(Number(val) || 0);
exports.roundInt = roundInt;
const mapToDebtItemDTO = (rawItem) => {
    const aging = rawItem.aging;
    // phân loại theo chốt kỳ hạn: closedDebt + closedDebt
    // phân loại theo hạn thanh toán: overdueDebt + notDueDebt
    return {
        customerId: rawItem.customerId || "",
        customerName: rawItem.customerName || "",
        companyName: rawItem.companyName || "",
        totalDebt: (0, exports.roundInt)(rawItem.totalDebt),
        closedDebt: (0, exports.roundInt)(rawItem.closedDebt),
        currentPeriodDebt: (0, exports.roundInt)(rawItem.currentPeriodDebt),
        overdueDebt: (0, exports.roundInt)(rawItem.dueDebt),
        notDueDebt: (0, exports.roundInt)(rawItem.notDueDebt),
        unpaidOutboundCount: rawItem.unpaidOutboundCount || 0,
        aging: {
            dueIn1_3: (0, exports.roundInt)(aging?.dueIn1_3),
            overdue1_30: (0, exports.roundInt)(aging?.overdue1_30),
            overdue31_60: (0, exports.roundInt)(aging?.overdue31_60),
            overdue61_90: (0, exports.roundInt)(aging?.overdue61_90),
            overdue91_120: (0, exports.roundInt)(aging?.overdue91_120),
            overdueOver120: (0, exports.roundInt)(aging?.overdueOver120),
        },
    };
};
exports.mapToDebtItemDTO = mapToDebtItemDTO;
// Helper tính tổng công nợ từ danh sách khách hàng đã lọc
const calculateGrandTotalFromCustomers = (customers) => {
    return customers.reduce((acc, cust) => {
        acc.totalDebt += cust.totalDebt;
        acc.closedDebt += cust.closedDebt;
        acc.currentPeriodDebt += cust.currentPeriodDebt;
        acc.dueDebt += cust.dueDebt;
        acc.notDueDebt += cust.notDueDebt;
        acc.unpaidOutboundCount += cust.unpaidOutboundCount;
        acc.aging.dueIn1_3 += cust.aging?.dueIn1_3 || 0;
        acc.aging.overdue1_30 += cust.aging?.overdue1_30 || 0;
        acc.aging.overdue31_60 += cust.aging?.overdue31_60 || 0;
        acc.aging.overdue61_90 += cust.aging?.overdue61_90 || 0;
        acc.aging.overdue91_120 += cust.aging?.overdue91_120 || 0;
        acc.aging.overdueOver120 += cust.aging?.overdueOver120 || 0;
        return acc;
    }, {
        customerId: "",
        customerName: "TỔNG CỘNG",
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
};
exports.calculateGrandTotalFromCustomers = calculateGrandTotalFromCustomers;
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
exports.processDebtAggregation = processDebtAggregation;
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
exports.checkIsClosingDay = checkIsClosingDay;
//helper payment debt
const coreCustomerPayment = ({ amount, paymentMethod, outboundSlipCodes, customerOutbounds, updatedOutboundMap, allocationsToCreate, }) => {
    let remainingPaymentPool = (0, exports.round2)(amount);
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
            const payAmount = (0, exports.round2)(Math.min(currentRemaining, remainingPaymentPool));
            const newPaid = (0, exports.round2)(currentPaid + payAmount);
            const newRemaining = Math.max(0, (0, exports.round2)(currentRemaining - payAmount));
            updatedOutboundMap.set(outbound.outboundId, {
                outbound,
                paidAmount: newPaid,
                remainingAmount: newRemaining,
            });
            allocationsToCreate.push({
                outboundId: outbound.outboundId,
                amountAllocation: payAmount,
                paymentMethod,
                customerId: outbound.customerId,
            });
            remainingPaymentPool = Math.max(0, (0, exports.round2)(remainingPaymentPool - payAmount));
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
            const payAmount = (0, exports.round2)(Math.min(currentRemaining, remainingPaymentPool));
            const newPaid = (0, exports.round2)(currentPaid + payAmount);
            const newRemaining = Math.max(0, (0, exports.round2)(currentRemaining - payAmount));
            updatedOutboundMap.set(outbound.outboundId, {
                outbound,
                paidAmount: newPaid,
                remainingAmount: newRemaining,
            });
            allocationsToCreate.push({
                outboundId: outbound.outboundId,
                amountAllocation: payAmount,
                paymentMethod,
                customerId: outbound.customerId,
            });
            remainingPaymentPool = Math.max(0, (0, exports.round2)(remainingPaymentPool - payAmount));
        }
    }
    return remainingPaymentPool;
};
exports.coreCustomerPayment = coreCustomerPayment;
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
exports.parseExcelRows = parseExcelRows;
//# sourceMappingURL=core_debt_helper.js.map