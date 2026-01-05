import { NextFunction, Request, Response } from "express";
import { deliveryService } from "../../../service/deliveryService";

//=================================PLANNING ESTIMATE TIME=====================================

export const getPlanningEstimateTime = async (req: Request, res: Response, next: NextFunction) => {
  const { page, pageSize, dayStart, estimateTime } = req.body as {
    page: number;
    pageSize: number;
    dayStart: string;
    estimateTime: string;
  };

  try {
    const response = await deliveryService.getPlanningEstimateTime({
      page,
      pageSize,
      dayStart: new Date(dayStart),
      estimateTime,
    });
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const confirmReadyDeliveryPlanning = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const response = await deliveryService.confirmReadyDeliveryPlanning();
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//=================================PLANNING DELIVERY=====================================

export const getPlanningDelivery = async (req: Request, res: Response, next: NextFunction) => {
  const { dayDelivery } = req.query as { dayDelivery: string };

  try {
    const response = await deliveryService.getPlanningDelivery();
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const confirmForDeliveryPlanning = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const response = await deliveryService.confirmForDeliveryPlanning();
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
