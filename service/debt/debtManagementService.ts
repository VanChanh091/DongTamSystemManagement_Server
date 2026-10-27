import * as xlsx from "xlsx";
import ExcelJS from "exceljs";
import { Response } from "express";
import { Transaction } from "sequelize";
import { AppError } from "../../utils/appError";
import { debtRepository } from "../../repository/debtRepository";
import { dayjsUtc } from "../../assets/configs/dayjs/dayjs.config";
import { PaymentType } from "../../models/customer/customerPayment";
import { styleHeaderStream } from "../../utils/helper/excelExporter";
import { runInTransaction } from "../../utils/helper/transactionHelper";
import { OutboundHistory } from "../../models/warehouse/outbound/outboundHistory";
import {
  PaymentAllocation,
  PaymentMethodType,
} from "../../models/warehouse/payment/paymentAllocation";
import { DebtItemDTO, DeductionInput, ParsedExcelRow } from "../../interface/debt.type";
import {
  debtCustomerColumns,
  mappingDebtCustomerRow,
} from "../../utils/mapping/warehouse/debtCustomerRowAndColumn";
import { normalizeVN } from "../../utils/helper/normalizeVN";
import {
  calculateGrandTotalFromCustomers,
  checkIsClosingDay,
  coreCustomerPayment,
  mapToDebtItemDTO,
  parseExcelRows,
  processDebtAggregation,
  round2,
} from "../../utils/helper/core_debt_helper";

export const debtManagementService = {
  //================================DEBT CLOSING=================================
  getCustomerDebtSummary: async ({
    page,
    pageSize,
    userId,
    targetDate,
    search,
  }: {
    page: number;
    pageSize: number;
    userId?: number;
    targetDate: Date | string;
    search?: string;
  }) => {
    try {
      //Kéo toàn bộ PXK chưa thanh toán từ DB
      const unpaidOutbounds = await debtRepository.findOutboundUnpaid({
        userId,
        targetDate,
      });

      // Gom nhóm và tính toán Grand Total cho TOÀN BỘ hệ thống
      const { sortedCustomers, grandTotal } = processDebtAggregation(unpaidOutbounds, targetDate);

      // Lọc khách hàng bằng hàm normalizeVN
      let filteredCustomers = sortedCustomers;
      let finalGrandTotal = grandTotal;
      if (search && search.trim()) {
        const keyword = normalizeVN(search);

        filteredCustomers = sortedCustomers.filter((cust) => {
          const nameMatch = normalizeVN(cust.customerName).includes(keyword);
          const companyMatch = normalizeVN(cust.companyName).includes(keyword);
          const idMatch = cust.customerId
            ? cust.customerId.toString().toLowerCase().includes(keyword)
            : false;

          return nameMatch || companyMatch || idMatch;
        });

        finalGrandTotal = calculateGrandTotalFromCustomers(filteredCustomers);
      }

      // Phân trang chỉ cho mảng dữ liệu hiển thị (data)
      const totalCustomers = filteredCustomers.length;
      const totalPages = Math.ceil(totalCustomers / pageSize) || 1;
      const startIndex = (page - 1) * pageSize;
      const paginatedItems = filteredCustomers.slice(startIndex, startIndex + pageSize);

      return {
        message: "Lấy danh sách công nợ thành công",
        targetDate: targetDate || new Date().toISOString(),
        data: paginatedItems.map(mapToDebtItemDTO),
        grandTotal: mapToDebtItemDTO(finalGrandTotal),
        totalCustomers,
        totalPages,
        currentPage: page,
      };
    } catch (error) {
      console.error("Error in getCustomerDebtSummary:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  // hàm này chỉ check termPaymentDays của khách hàng, không check closingDays
  closeDebtForSingleCustomer: async ({
    customerId,
    closingDate = new Date(),
  }: {
    customerId: string;
    closingDate: Date;
  }) => {
    try {
      return await runInTransaction(async (transaction: Transaction) => {
        let termDays;
        if (termDays === undefined) {
          const config = await debtRepository.findOneCustomerPayment(customerId, transaction);
          if (!config) {
            throw AppError.NotFound(
              "Chưa cấu hình công nợ cho khách hàng này",
              "DEBT_CONFIG_NOT_FOUND",
            );
          }

          termDays = config.paymentTermDays;
        }

        // Đưa closingDate về mốc cuối ngày 23:59:59.999
        const effectiveClosingDate = dayjsUtc(closingDate).endOf("day").toDate();

        // Tính hạn thanh toán (dueDate)
        const dueDate = dayjsUtc(effectiveClosingDate)
          .add(Number(termDays) || 0, "day")
          .endOf("day")
          .toDate();

        // Tìm tất cả các Phiếu Xuất Kho (PXK) <= closingDate chưa được chưa chốt
        const [updatedCount] = await debtRepository.updateDueDateForOutbound({
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
          dueDateCalculated: dayjsUtc(dueDate).format("YYYY-MM-DD HH:mm:ss"),
        };
      });
    } catch (error) {
      console.error("Error occurred while closing debt for single customer:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  processAutoDebtClosing: async (targetDate: Date = new Date()) => {
    try {
      return await runInTransaction(async (transaction: Transaction) => {
        const closingDate = dayjsUtc(targetDate).endOf("day").toDate();
        const formattedDate = dayjsUtc(closingDate).format("YYYY-MM-DD HH:mm:ss");

        // Lấy toàn bộ cấu hình công nợ của khách hàng
        const configs = await debtRepository.findAllRawCustomerPayment();

        const dueDateGroups = new Map<string, { dueDate: Date; customerIds: string[] }>();

        for (const config of configs) {
          const isClosing = checkIsClosingDay({
            paymentType: config.paymentType,
            closingDays: config.closingDays,
            targetDate: closingDate,
          });

          if (isClosing) {
            const calculatedDueDate = dayjsUtc(closingDate)
              .add(Number(config.paymentTermDays) || 0, "day")
              .endOf("day")
              .toDate();

            const key = calculatedDueDate.toISOString();
            if (!dueDateGroups.has(key)) {
              dueDateGroups.set(key, { dueDate: calculatedDueDate, customerIds: [] });
            }
            dueDateGroups.get(key)!.customerIds.push(config.customerId);
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
          const [updatedCount] = await debtRepository.updateDueDateForOutbound({
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
    } catch (error) {
      console.error("Error in processAutoDebtClosing:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  exportCustomerDebtSummaryToExcel: async (res: Response, targetDate: Date | string) => {
    try {
      // 1. Kéo toàn bộ dữ liệu & chạy logic tổng hợp như getCustomerDebtSummary
      const unpaidOutbounds = await debtRepository.findOutboundUnpaid({ targetDate });
      const { sortedCustomers, grandTotal } = processDebtAggregation(unpaidOutbounds);

      const dateStr = dayjsUtc(targetDate).format("DD-MM-YYYY");
      const fileName = `debt_customer_${dateStr}`;

      // 2. Cấu hình Header HTTP Response
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader("Content-Disposition", `attachment; filename=${fileName}.xlsx`);

      // 3. Khởi tạo Stream Workbook
      const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
        stream: res,
        useStyles: true,
      });

      const worksheet = workbook.addWorksheet("Tổng Hợp Công Nợ");

      // 4. Cấu hình các cột tương ứng với DebtItemDTO
      worksheet.columns = debtCustomerColumns as ExcelJS.Column[];

      //header style
      styleHeaderStream(worksheet);

      const cellBorder = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      const cellFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F2F2" } };

      // 5. Ghi từng dòng Khách hàng
      const totalColumns = debtCustomerColumns.length;

      sortedCustomers.forEach((rawItem, index) => {
        const item = mapToDebtItemDTO(rawItem);
        const rowData = mappingDebtCustomerRow(item, index);

        const excelRow = worksheet.addRow(rowData);

        for (let i = 1; i <= totalColumns; i++) {
          const cell = excelRow.getCell(i);
          cell.border = cellBorder as any;
          cell.fill = cellFill as any;
        }

        excelRow.commit();
      });

      // 6. Ghi dòng TỔNG CỘNG toàn hệ thống ở cuối file
      const grandItem = mapToDebtItemDTO(grandTotal);
      const grandRowData = {
        ...mappingDebtCustomerRow(grandItem, 0),
        index: "",
        customerId: "",
        customerName: "TỔNG CỘNG",
      };

      const totalRow = worksheet.addRow(grandRowData);
      totalRow.font = { bold: true };

      for (let i = 1; i <= totalColumns; i++) {
        const cell = totalRow.getCell(i);
        cell.border = cellBorder as any;
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
    } catch (error) {
      console.error("Export Debt Excel error:", error);
      if (!res.headersSent) {
        res.status(500).send("Lỗi trong quá trình xuất file");
      }
    }
  },

  //================================PAYMENT DEBT=================================
  paymentDebtByCustomerId: async ({
    customerId,
    amount,
    paymentMethod,
    outboundSlipCodes,
  }: {
    customerId: string;
    amount: number;
    paymentMethod: PaymentMethodType;
    outboundSlipCodes?: string[];
  }) => {
    try {
      return await runInTransaction(async (transaction: Transaction) => {
        if (amount <= 0) throw AppError.BadRequest("Số tiền phải lớn hơn 0");

        // lấy danh sách PXK chưa thanh toán của khách hàng
        const outbounds = await debtRepository.findOutboundUnpaid({
          customerId,
          transaction,
          lock: transaction.LOCK.UPDATE,
          includeCustomer: false,
        });

        const updatedOutboundMap = new Map();
        const allocationsToCreate: any[] = [];

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
          const bulkUpdateData = Array.from(updatedOutboundMap.values()).map(
            ({ outbound, paidAmount, remainingAmount }) => ({
              ...outbound,
              paidAmount,
              remainingAmount,
              status: remainingAmount === 0 ? "paid" : "partial",
            }),
          );

          await debtRepository.bulkUpdateOutboundStatus(bulkUpdateData, transaction);
        }
        if (allocationsToCreate.length > 0) {
          await debtRepository.bulkCreatePaymentAllocation(allocationsToCreate, transaction);
        }

        return {
          message: `Cấn trừ cho khách hàng: ${customerId} thành công`,
          totalPayment: round2(amount),
          allocatedTotal: round2(amount - excessAmount),
          excessAmount,
        };
      });
    } catch (error) {
      console.error("Error occurred while processing customer payment:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  importAmountPaymentFromExcel: async (fileBuffer: Buffer) => {
    try {
      return await runInTransaction(async (transaction: Transaction) => {
        const workbook = xlsx.read(fileBuffer, { type: "buffer" });
        const rawData = xlsx.utils.sheet_to_json<Record<string, any>>(
          workbook.Sheets[workbook.SheetNames[0]],
        );

        if (!rawData || rawData.length === 0) throw AppError.BadRequest("File rỗng", "EMPTY_FILE");

        // Parse Excel sang array
        const parsedRows = parseExcelRows(rawData); // Hàm đọc Excel
        const uniqueCustomerIds = Array.from(new Set(parsedRows.map((r) => r.customerId)));

        // Lấy tất cả các PXK chưa thanh toán của các khách hàng
        const allOutbounds = await debtRepository.findOutboundUnpaid({
          customerId: uniqueCustomerIds,
          transaction,
          lock: transaction.LOCK.UPDATE,
          includeCustomer: false,
        });

        // Group theo CustomerId
        const customerOutboundsMap = new Map<string, OutboundHistory[]>();
        for (const ob of allOutbounds) {
          const list = customerOutboundsMap.get(ob.customerId) || [];
          list.push(ob);
          customerOutboundsMap.set(ob.customerId, list);
        }

        const updatedOutboundMap = new Map();
        const allocationsToCreate: any[] = [];
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
          const bulkUpdateData = Array.from(updatedOutboundMap.values()).map(
            ({ outbound, paidAmount, remainingAmount }) => ({
              ...outbound,
              paidAmount,
              remainingAmount,
              status: remainingAmount === 0 ? "paid" : "partial",
            }),
          );

          await debtRepository.bulkUpdateOutboundStatus(bulkUpdateData, transaction);
        }
        if (allocationsToCreate.length > 0) {
          await debtRepository.bulkCreatePaymentAllocation(allocationsToCreate, transaction);
        }

        return {
          message: "Import thành công",
          totalProcessedRows: parsedRows.length,
          totalAllocatedAmount: totalAllocated,
        };
      });
    } catch (error) {
      console.error("Error occurred while importing payment amounts from Excel:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },

  writeOffDebt: async (outboundSlipCode: string) => {
    try {
      return await runInTransaction(async (transaction: Transaction) => {
        const outbound = await debtRepository.findOutboundById({
          outboundSlipCode,
          options: {
            transaction,
            lock: transaction.LOCK.UPDATE,
          },
        });
        if (!outbound) {
          throw AppError.BadRequest(
            "PXK không tồn tại hoặc đã được thanh toán hết",
            "OUTBOUND_NOT_FOUND",
          );
        }

        const remaining = Number(outbound.remainingAmount || 0);
        await outbound.update(
          { remainingAmount: 0, status: "paid", writeOffAmount: remaining },
          { transaction },
        );

        await PaymentAllocation.create(
          {
            outboundId: outbound.outboundId,
            amountAllocation: remaining,
            customerId: outbound.customerId,
          },
          { transaction },
        );

        return { message: "Xóa nợ phiếu xuất kho thành công", writtenOffAmount: remaining };
      });
    } catch (error) {
      console.error("Error occurred while writing off debt:", error);
      if (error instanceof AppError) throw error;
      throw AppError.ServerError();
    }
  },
};
