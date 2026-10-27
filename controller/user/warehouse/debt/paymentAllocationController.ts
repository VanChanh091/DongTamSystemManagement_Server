import { NextFunction, Request, Response } from "express";
import { paymentAllocationService } from "../../../../service/debt/paymentAllocationService";

export const getPaymentAlocationHistory = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { outboundId } = req.query as { outboundId: string };

  try {
    const response = await paymentAllocationService.getPaymentAlocationHistory({
      outboundId: Number(outboundId),
    });
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const exportExcelPaymentAllocations = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { fromDate, toDate } = req.body as { fromDate: string | Date; toDate: string | Date };

  try {
    await paymentAllocationService.exportExcelPaymentAllocations({
      res,
      fromDate,
      toDate,
      username: req.user.fullName,
    });
  } catch (error) {
    next(error);
  }
};
