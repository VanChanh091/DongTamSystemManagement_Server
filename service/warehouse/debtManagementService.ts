import { Op, Transaction } from "sequelize";
import { CustomerPayment, PaymentType } from "../../models/customer/customerPayment";
import { OutboundHistory } from "../../models/warehouse/outbound/outboundHistory";
import { AppError } from "../../utils/appError";
import { runInTransaction } from "../../utils/helper/transactionHelper";
import { Customer } from "../../models/customer/customer";
import { DebtItemDTO } from "../../interface/debtSummary.type";
import { dayjsUtc } from "../../assets/configs/dayjs/dayjs.config";

const devEnvironment = process.env.NODE_ENV !== "production";
// const { outbound } = CacheKey.warehouse;

export const debtManagementService = {
  checkIsClosingDay: ({
    paymentType,
    closingDays,
    targetDate = new Date(),
  }: {
    paymentType: PaymentType;
    closingDays?: number[] | null;
    targetDate?: Date;
  }): boolean => {
    try {
      // tạo bản để tránh bị biến đổi đối tượng Date gốc
      const targetDayjs = dayjsUtc(targetDate);
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
          if (safeClosingDays.includes(dateOfMonth)) return true;

          // Xử lý tháng thiếu ngày (VD: tháng 2 có 28 hoặc 29 ngày)
          const hasOverflowDay = safeClosingDays.some((day) => day >= lastDayOfMonth);
          if (hasOverflowDay && dateOfMonth === lastDayOfMonth) {
            return true;
          }

          return false;

        default:
          return false;
      }
    } catch (error) {
      console.error("Error occurred while checking closing day:", error);
      return false;
    }
  },

  //CHỨC NĂNG: CHỐT CÔNG NỢ THỦ CÔNG CHO 1 KHÁCH HÀNG CỤ THỂ
  // hàm này chỉ check termPaymentDays của khách hàng, không check closingDays
  closeDebtForSingleCustomer: async ({
    customerId,
    closingDate = new Date(),
    overridePaymentTermDays,
  }: {
    customerId: string;
    closingDate: Date;
    overridePaymentTermDays?: number;
  }) => {
    return await runInTransaction(async (transaction: Transaction) => {
      let termDays = overridePaymentTermDays;
      if (termDays === undefined) {
        const config = await CustomerPayment.findOne({
          where: { customerId },
          attributes: ["paymentTermDays"],
          raw: true,
          transaction,
        });

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
      const [updatedCount] = await OutboundHistory.update(
        { dueDate },
        {
          where: {
            customerId,
            dueDate: null,
            remainingAmount: { [Op.gt]: 0 },
            dateOutbound: { [Op.lte]: effectiveClosingDate },
            status: { [Op.in]: ["unpaid", "partial"] },
          },
          transaction,
        },
      );

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
  },

  processAutoDebtClosing: async (targetDate: Date = new Date()) => {
    try {
      return await runInTransaction(async (transaction: Transaction) => {
        const closingDate = dayjsUtc(targetDate).endOf("day").toDate();
        const formattedDate = dayjsUtc(closingDate).format("YYYY-MM-DD HH:mm:ss");

        // Lấy toàn bộ cấu hình công nợ của khách hàng
        const configs = await CustomerPayment.findAll({
          attributes: ["customerId", "paymentType", "closingDays", "paymentTermDays"],
          raw: true,
        });

        const dueDateGroups = new Map<string, { dueDate: Date; customerIds: string[] }>();

        for (const config of configs) {
          const isClosing = debtManagementService.checkIsClosingDay({
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
          const [updatedCount] = await OutboundHistory.update(
            { dueDate },
            {
              where: {
                customerId: { [Op.in]: customerIds },
                dueDate: null,
                remainingAmount: { [Op.gt]: 0 },
                dateOutbound: { [Op.lte]: closingDate },
                status: { [Op.in]: ["unpaid", "partial"] },
              },
              transaction,
            },
          );
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

  getCustomerDebtSummary: async (customerId?: string) => {
    const whereCondition: any = {
      status: { [Op.in]: ["unpaid", "partial"] },
      remainingAmount: { [Op.gt]: 0 },
    };

    if (customerId) {
      whereCondition.customerId = customerId;
    }

    // lấy tất cả các PXK chưa thanh toán và chưa chốt công nợ
    const unpaidOutbounds = await OutboundHistory.findAll({
      where: whereCondition,
      include: [
        {
          model: Customer,
          attributes: { exclude: ["createdAt", "updatedAt"] },
        },
      ],
      order: [["dateOutbound", "ASC"]],
      raw: true,
      nest: true, // cần có để lấy được thông tin customer
    });

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const customerMap = new Map<
      string,
      {
        customerId: string;
        customerName: string;
        totalDebt: number;
        closedDebt: number;
        currentPeriodDebt: number;
        dueDebt: number;
        notDueDebt: number;
        unpaidOutboundCount: number;
        aging: {
          inTerm: number;
          overdue1_30: number;
          overdue31_60: number;
          overdue61_90: number;
          overdueOver90: number;
        };
      }
    >();

    const grandTotal = {
      totalDebt: 0,
      closedDebt: 0,
      currentPeriodDebt: 0,
      dueDebt: 0,
      notDueDebt: 0,
      unpaidOutboundCount: unpaidOutbounds.length,
      aging: {
        inTerm: 0,
        overdue1_30: 0,
        overdue31_60: 0,
        overdue61_90: 0,
        overdueOver90: 0,
      },
    };

    for (const pxk of unpaidOutbounds) {
      const remaining = Number(pxk.remainingAmount || 0);
      const custId = pxk.customerId;

      if (!customerMap.has(custId)) {
        customerMap.set(custId, {
          customerId: custId,
          customerName: pxk.Customer?.customerName || "",
          totalDebt: 0,
          closedDebt: 0,
          currentPeriodDebt: 0,
          dueDebt: 0,
          notDueDebt: 0,
          unpaidOutboundCount: 0,
          aging: {
            inTerm: 0,
            overdue1_30: 0,
            overdue31_60: 0,
            overdue61_90: 0,
            overdueOver90: 0,
          },
        });
      }

      const summary = customerMap.get(custId)!;

      summary.totalDebt += remaining;
      summary.unpaidOutboundCount += 1;
      grandTotal.totalDebt += remaining;

      if (pxk.dueDate) {
        summary.closedDebt += remaining;
        grandTotal.closedDebt += remaining;

        const dueDate = new Date(pxk.dueDate);
        dueDate.setHours(0, 0, 0, 0);

        const diffTime = now.getTime() - dueDate.getTime();
        const daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (daysOverdue <= 0) {
          summary.notDueDebt += remaining;
          summary.aging.inTerm += remaining;

          grandTotal.notDueDebt += remaining;
          grandTotal.aging.inTerm += remaining;
        } else {
          summary.dueDebt += remaining;
          grandTotal.dueDebt += remaining;

          if (daysOverdue <= 30) {
            summary.aging.overdue1_30 += remaining;
            grandTotal.aging.overdue1_30 += remaining;
          } else if (daysOverdue <= 60) {
            summary.aging.overdue31_60 += remaining;
            grandTotal.aging.overdue31_60 += remaining;
          } else if (daysOverdue <= 90) {
            summary.aging.overdue61_90 += remaining;
            grandTotal.aging.overdue61_90 += remaining;
          } else {
            summary.aging.overdueOver90 += remaining;
            grandTotal.aging.overdueOver90 += remaining;
          }
        }
      } else {
        // Đơn chưa chốt nợ -> Gom vào nợ trong kỳ và tính trong hạn
        summary.currentPeriodDebt += remaining;
        summary.notDueDebt += remaining;
        summary.aging.inTerm += remaining;

        grandTotal.currentPeriodDebt += remaining;
        grandTotal.notDueDebt += remaining;
        grandTotal.aging.inTerm += remaining;
      }
    }

    const formattedItems = Array.from(customerMap.values()).map(mapToDebtItemDTO);
    const formattedGrandTotal = mapToDebtItemDTO(grandTotal);

    return {
      message: "Lấy danh sách công nợ khách hàng thành công",
      items: formattedItems,
      grandTotal: formattedGrandTotal,
      totalCustomers: formattedItems.length,
    };
  },
};

const round2 = (val: number): number => Math.round((val + Number.EPSILON) * 100) / 100;

const mapToDebtItemDTO = (rawItem: any): DebtItemDTO => {
  const aging = rawItem.aging;

  return {
    customerId: rawItem.customerId || "",
    customerName: rawItem.customerName || "",
    totalDebt: round2(rawItem.totalDebt || 0),
    closedDebt: round2(rawItem.closedDebt || 0),
    currentPeriodDebt: round2(rawItem.currentPeriodDebt || 0),
    dueDebt: round2(rawItem.dueDebt || 0),
    notDueDebt: round2(rawItem.notDueDebt || 0),
    unpaidOutboundCount: rawItem.unpaidOutboundCount || 0,
    aging: {
      inTerm: round2(aging?.inTerm || 0),
      overdue1_30: round2(aging?.overdue1_30 || 0),
      overdue31_60: round2(aging?.overdue31_60 || 0),
      overdue61_90: round2(aging?.overdue61_90 || 0),
      overdueOver90: round2(aging?.overdueOver90 || 0),
    },
  };
};
