import { NextFunction, Request, Response } from "express";
import { debtDeductionService } from "../../../../service/warehouse/debtDeductionService";

export const getDebtDeductionRequests = async (req: Request, res: Response, next: NextFunction) => {
  const { page, pageSize, status, customerId, userId } = req.query as {
    page: string;
    pageSize: string;
    status: string[];
    customerId?: string;
    userId?: string;
  };

  try {
    if (!page || !pageSize) {
      return res
        .status(400)
        .json({ message: "Missing required query parameters: page and pageSize" });
    }

    const arrayStatus = Array.isArray(status) ? status : status ? [status] : [];

    const result = await debtDeductionService.getDebtDeductionRequests({
      page: Number(page),
      pageSize: Number(pageSize),
      status: arrayStatus,
      currentUser: req.user,
      targetUserId: userId ? Number(userId) : undefined,
      customerId: customerId ? customerId : undefined,
    });

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const createDebtDeduction = async (req: Request, res: Response, next: NextFunction) => {
  const { customerId, amountRequested, paymentMethod } = req.body as {
    customerId: string;
    amountRequested: number;
    paymentMethod: string;
  };

  try {
    const result = await debtDeductionService.createRequest({
      currentUser: req.user,
      customerId,
      amountRequested: Number(amountRequested),
      paymentMethod,
    });

    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const updateDebtDeduction = async (req: Request, res: Response, next: NextFunction) => {
  const { requestId } = req.query as { requestId: string };
  const { amountRequested, paymentMethod } = req.body as {
    amountRequested: number;
    paymentMethod: string;
  };

  try {
    const result = await debtDeductionService.updateRequest({
      currentUser: req.user,
      requestId: Number(requestId),
      amountRequested,
      paymentMethod,
    });

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const deleteDebtDeduction = async (req: Request, res: Response, next: NextFunction) => {
  const { requestId } = req.query as { requestId: string };

  try {
    const result = await debtDeductionService.deleteRequest({
      currentUser: req.user,
      requestId: Number(requestId),
    });

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const requestOrVerifyUrgentOtp = async (req: Request, res: Response, next: NextFunction) => {
  const { requestId, otp } = req.query as { requestId: string; otp?: string };

  try {
    let result;

    if (otp) {
      result = await debtDeductionService.verifyUrgentOtp({
        username: req.user.fullName,
        requestId: Number(requestId),
        otp: Number(otp),
      });
    } else {
      result = await debtDeductionService.requestUrgentOtp({
        requestId: Number(requestId),
      });
    }
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// approve or reject debt deduction request (for admin/manager)
export const updateDebtDeductionStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { requestId } = req.query as { requestId: string };
  const { status, rejectReason } = req.body as {
    status: "approved" | "rejected";
    rejectReason?: string;
  };

  try {
    const result = await debtDeductionService.updateRequestStatus({
      currentUser: req.user,
      requestId: Number(requestId),
      newStatus: status,
      rejectReason,
    });

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
