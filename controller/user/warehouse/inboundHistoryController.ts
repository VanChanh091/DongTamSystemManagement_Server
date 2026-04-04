import { NextFunction, Request, Response } from "express";
import { inboundService } from "../../../service/warehouse/inboundService";

//====================================CHECK AND INBOUND QTY========================================
export const getPlanningWaitingCheck = async (req: Request, res: Response, next: NextFunction) => {
  const { isPaper, planningBoxId } = req.query as { isPaper?: string; planningBoxId?: string };
  try {
    let response;

    if (planningBoxId) {
      response = await inboundService.getBoxCheckedDetail(Number(planningBoxId));
    } else {
      if (isPaper === "true") {
        response = await inboundService.getPaperWaitingChecked();
      } else {
        response = await inboundService.getBoxWaitingChecked();
      }
    }

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//===============================INBOUND HISTORY=====================================
export const getInboundHistory = async (req: Request, res: Response, next: NextFunction) => {
  const { field, keyword, page, pageSize } = req.query as {
    field?: string;
    keyword?: string;
    page: string;
    pageSize: string;
  };

  try {
    let response;
    if (field && keyword) {
      response = await inboundService.getInboundByField({
        field,
        keyword,
        page: Number(page),
        pageSize: Number(pageSize),
      });
    } else {
      response = await inboundService.getAllInboundHistory(Number(page), Number(pageSize));
    }

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
