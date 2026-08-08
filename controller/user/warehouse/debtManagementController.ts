import { NextFunction, Request, Response } from "express";
import { debtManagementService } from "../../../service/warehouse/debtManagementService";
import { AppError } from "../../../utils/appError";

//=================================CLOSING DEBT=======================================
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

//=================================PAYMENT=======================================
export const paymentDebtByCustomerId = async (req: Request, res: Response, next: NextFunction) => {
  const { customerId, amount, outboundSlipCodes } = req.body as {
    customerId: string;
    amount: number;
    outboundSlipCodes: string[];
  };

  try {
    if (!customerId) {
      throw AppError.BadRequest(
        "Cần truyền mã khách hàng khi chốt nợ thủ công",
        "MISSING_CUSTOMER_ID",
      );
    }

    const response = await debtManagementService.paymentDebtByCustomerId({
      customerId,
      amount,
      paymentMethod: "MANUAL",
      outboundSlipCodes,
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const importAmountPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw AppError.BadRequest("Vui lòng tải lên file Excel (.xlsx, .xls)", "FILE_REQUIRED");
    }

    const response = await debtManagementService.importAmountPaymentFromExcel(req.file.buffer);

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
