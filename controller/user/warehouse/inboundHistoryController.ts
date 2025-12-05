import { NextFunction, Request, Response } from "express";
import { inboundService } from "../../../service/warehouse/inboundService";

//get all
export const getAllInboundHistory = async (req: Request, res: Response, next: NextFunction) => {
  const { page = 1, pageSize = 20 } = req.query as { page?: string; pageSize?: string };

  try {
    const response = await inboundService.getAllInboundHistory(Number(page), Number(pageSize));
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//search by field
export const getInboundByField = async (req: Request, res: Response, next: NextFunction) => {
  const { field, keyword, page, pageSize } = req.query as {
    field: string;
    keyword: string;
    page: string;
    pageSize: string;
  };

  try {
    // const response = await inboundService.getInboundByField({
    //   field,
    //   keyword,
    //   page: Number(page),
    //   pageSize: Number(pageSize),
    // });
    // return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//export excel
export const exportExcelInbound = async (req: Request, res: Response, next: NextFunction) => {
  const { status, joinDate, all = false } = req.body;

  try {
    // await inboundService.exportExcelInbound(res, { status, joinDate, all });
  } catch (error) {
    next(error);
  }
};
