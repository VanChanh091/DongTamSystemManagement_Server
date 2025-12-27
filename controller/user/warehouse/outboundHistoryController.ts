import { NextFunction, Request, Response } from "express";
import { outboundService } from "../../../service/warehouse/outboundService";
import { AppError } from "../../../utils/appError";

//===============================OUTBOUND HISTORY=====================================

export const getAllOutboundHistory = async (req: Request, res: Response, next: NextFunction) => {
  const { page, pageSize } = req.query as { page: string; pageSize: string };

  try {
    const response = await outboundService.getAllOutboundHistory(Number(page), Number(pageSize));
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const getOutboundDetail = async (req: Request, res: Response, next: NextFunction) => {
  const { outboundId } = req.query as { outboundId: string };

  try {
    const response = await outboundService.getOutboundDetail(Number(outboundId));
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const createOutbound = async (req: Request, res: Response, next: NextFunction) => {
  let { outboundDetails } = req.body as {
    outboundDetails: { orderId: string; outboundQty: number }[] | any;
  };

  try {
    if (!Array.isArray(outboundDetails)) {
      if (!outboundDetails) {
        throw AppError.BadRequest(
          "outboundDetails phải là mảng hoặc giá trị hợp lệ",
          "INVALID_ORDER_IDS"
        );
      }
      outboundDetails = [outboundDetails];
    }
    const response = await outboundService.createOutbound({ outboundDetails });
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const updateOutbound = async (req: Request, res: Response, next: NextFunction) => {
  let { outboundId, outboundDetails } = req.body as {
    outboundId: number;
    outboundDetails: { orderId: string; outboundQty: number }[] | any;
  };

  try {
    if (!Array.isArray(outboundDetails)) {
      if (!outboundDetails) {
        throw AppError.BadRequest(
          "outboundDetails phải là mảng hoặc giá trị hợp lệ",
          "INVALID_ORDER_IDS"
        );
      }
      outboundDetails = [outboundDetails];
    }
    const response = await outboundService.updateOutbound({ outboundId, outboundDetails });
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const deleteOutbound = async (req: Request, res: Response, next: NextFunction) => {
  let { outboundId } = req.query as { outboundId: string };

  try {
    const response = await outboundService.deleteOutbound(Number(outboundId));
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const searchOutboundByField = async (req: Request, res: Response, next: NextFunction) => {
  const { field, keyword, page, pageSize } = req.query as {
    field: string;
    keyword: string;
    page: string;
    pageSize: string;
  };

  try {
    const response = await outboundService.searchOutboundByField({
      field,
      keyword,
      page: Number(page),
      pageSize: Number(pageSize),
    });
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const searchOrderIds = async (req: Request, res: Response, next: NextFunction) => {
  const { orderId } = req.query as { orderId: string };

  try {
    const response = await outboundService.searchOrderIds(orderId);
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const getOrderInboundQty = async (req: Request, res: Response, next: NextFunction) => {
  const { orderId } = req.query as { orderId: string };

  try {
    const response = await outboundService.getOrderInboundQty(orderId);
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const exportFileOutbound = async (req: Request, res: Response, next: NextFunction) => {
  const { outboundId } = req.query as { outboundId: string };

  try {
    const response = await outboundService.exportFileOutbound(res, Number(outboundId));
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
