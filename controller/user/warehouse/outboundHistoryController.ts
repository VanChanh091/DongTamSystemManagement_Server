import { NextFunction, Request, Response } from "express";
import { outboundService } from "../../../service/warehouse/outboundService";

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
