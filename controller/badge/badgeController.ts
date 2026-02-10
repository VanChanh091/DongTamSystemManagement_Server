import { NextFunction, Request, Response } from "express";
import { badgeService } from "../../service/badge/badgeService";

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
export const countWaitingCheckPaper = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await badgeService.countWaitingCheckPaper();
    return res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

export const countWaitingCheckBox = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await badgeService.countWaitingCheckBox();
    return res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};
