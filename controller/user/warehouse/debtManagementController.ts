import { NextFunction, Request, Response } from "express";
import { debtManagementService } from "../../../service/warehouse/debtManagementService";
import { AppError } from "../../../utils/appError";

export const getCustomerDebtSummary = async (req: Request, res: Response, next: NextFunction) => {
  const { customerId } = req.query as { customerId?: string };

  try {
    const response = await debtManagementService.getCustomerDebtSummary(customerId);
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const handleClosingDebt = async (req: Request, res: Response, next: NextFunction) => {
  const { customerId, closingDate, paymentTermDays, targetDate, isAuto } = req.body as {
    customerId: string;
    closingDate: Date;
    paymentTermDays?: number;
    targetDate?: Date;
    isAuto: boolean;
  };

  try {
    let response;

    if (isAuto) {
      const parsedTargetDate = targetDate ? new Date(targetDate) : new Date();
      response = await debtManagementService.processAutoDebtClosing(parsedTargetDate);
    } else {
      if (!customerId) {
        throw AppError.BadRequest(
          "Cần truyền mã khách hàng khi chốt nợ thủ công",
          "MISSING_CUSTOMER_ID",
        );
      }

      const parsedClosingDate = closingDate ? new Date(closingDate) : new Date();

      response = await debtManagementService.closeDebtForSingleCustomer({
        customerId,
        closingDate: parsedClosingDate,
        overridePaymentTermDays: paymentTermDays,
      });
    }

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
