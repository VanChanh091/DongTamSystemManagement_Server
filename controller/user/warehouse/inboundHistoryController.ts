import { NextFunction, Request, Response } from "express";
import { inboundService } from "../../../service/warehouse/inboundService";

//====================================CHECK AND INBOUND QTY========================================

//get paper checked
export const getPaperWaitingChecked = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await inboundService.getPaperWaitingChecked();
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//get box checked
export const getBoxWaitingChecked = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await inboundService.getBoxWaitingChecked();
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const getBoxCheckedDetail = async (req: Request, res: Response, next: NextFunction) => {
  const { planningBoxId } = req.query as { planningBoxId: string };

  try {
    const response = await inboundService.getBoxCheckedDetail(Number(planningBoxId));
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//inbound paper
export const inboundQtyPaper = async (req: Request, res: Response, next: NextFunction) => {
  const { planningId, inboundQty } = req.query as { planningId: string; inboundQty: string };

  try {
    const response = await inboundService.inboundQtyPaper(Number(planningId), Number(inboundQty));
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//inbound box
export const inboundQtyBox = async (req: Request, res: Response, next: NextFunction) => {
  const { planningId, inboundQty } = req.query as { planningId: string; inboundQty: string };

  try {
    const response = await inboundService.inboundQtyBox(Number(planningId), Number(inboundQty));
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//===============================INBOUND HISTORY=====================================

export const getAllInboundHistory = async (req: Request, res: Response, next: NextFunction) => {
  const { page, pageSize } = req.query as { page: string; pageSize: string };

  try {
    const response = await inboundService.getAllInboundHistory(Number(page), Number(pageSize));
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const searchInboundByField = async (req: Request, res: Response, next: NextFunction) => {
  const { field, keyword, page, pageSize } = req.query as {
    field: string;
    keyword: string;
    page: string;
    pageSize: string;
  };

  try {
    const response = await inboundService.searchInboundByField({
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
