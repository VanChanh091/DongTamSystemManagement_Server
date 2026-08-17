import { AppError } from "../../../utils/appError";
import { NextFunction, Request, Response } from "express";
import { debtManagementService } from "../../../service/warehouse/debtManagementService";

//=================================CLOSING DEBT=======================================
export const getCustomerDebtSummary = async (req: Request, res: Response, next: NextFunction) => {
  const {
    customerId,
    userId,
    page = 1,
    pageSize = 30,
  } = req.query as {
    customerId?: string;
    userId?: string;
    search?: string;
    page?: string;
    pageSize?: string;
  };

  try {
    const isSale = req.user.permissions.includes("sale");
    const rawUserId = isSale ? req.user.userId : userId;

    const targetUserId =
      rawUserId !== undefined && rawUserId !== "" ? Number(rawUserId) : undefined;

    const response = await debtManagementService.getCustomerDebtSummary({
      page: Number(page),
      pageSize: Number(pageSize),
      userId: targetUserId,
    });
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const handleClosingDebt = async (req: Request, res: Response, next: NextFunction) => {
  const { customerId, targetDate, isAuto } = req.body as {
    customerId?: string;
    targetDate: Date;
    isAuto: boolean;
  };

  try {
    let response;

    const formatDate = targetDate ? new Date(targetDate) : new Date();

    if (isAuto) {
      response = await debtManagementService.processAutoDebtClosing(formatDate);
    } else {
      if (!customerId) {
        throw AppError.BadRequest(
          "Cần truyền mã khách hàng khi chốt nợ thủ công",
          "MISSING_CUSTOMER_ID",
        );
      }

      response = await debtManagementService.closeDebtForSingleCustomer({
        customerId,
        closingDate: formatDate,
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

export const writeOffDebt = async (req: Request, res: Response, next: NextFunction) => {
  const { outboundSlipCode } = req.query as { outboundSlipCode: string };
  try {
    const response = await debtManagementService.writeOffDebt(outboundSlipCode);
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
