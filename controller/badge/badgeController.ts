import { NextFunction, Request, Response } from "express";
import { badgeService } from "../../service/badge/badgeService";
import { AppError } from "../../utils/appError";

//pending order
export const countOrderPending = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await badgeService.countOrderPending();
    return res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

//order reject
export const countOrderRejected = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await badgeService.countOrderRejected(req.user.userId);
    return res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

//order pending planning
export const countOrderPendingPlanning = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const response = await badgeService.countOrderPendingPlanning();
    return res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

//planning stop
export const countPlanningStop = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await badgeService.countPlanningStop();
    return res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

//waiting check paper & box
export const countWaitingCheck = async (req: Request, res: Response, next: NextFunction) => {
  const { type } = req.query as { type: "paper" | "box" | "scrap" };
  try {
    let response;

    if (type === "paper") {
      response = await badgeService.countWaitingCheckPaper();
    } else if (type === "box") {
      response = await badgeService.countWaitingCheckBox();
    } else if (type === "scrap") {
      response = await badgeService.countWaitingCheckScrapReport();
    } else {
      throw AppError.BadRequest(
        "Invalid type query parameter. Must be 'paper', 'box', or 'scrap'.",
      );
    }

    return res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

//delivery request
export const countDeliveryRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await badgeService.countDeliveryRequest();
    return res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

//prepare goods
export const countRequestPrepareGoods = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await badgeService.countRequestPrepareGoods();
    return res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};
