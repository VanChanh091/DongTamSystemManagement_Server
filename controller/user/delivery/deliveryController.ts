import { NextFunction, Request, Response } from "express";
import { deliveryService } from "../../../service/deliveryService";
import { targetType } from "../../../models/delivery/deliveryItem";
import { off } from "process";

//=================================PLANNING ESTIMATE TIME=====================================

export const getPlanningEstimateTime = async (req: Request, res: Response, next: NextFunction) => {
  const { page, pageSize, dayStart, estimateTime } = req.query as {
    page: string;
    pageSize: string;
    dayStart: string;
    estimateTime: string;
  };

  try {
    const response = await deliveryService.getPlanningEstimateTime({
      page: Number(page),
      pageSize: Number(pageSize),
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
  const { planningIds } = req.query as { planningIds: string[] };

  try {
    const ids = Array.isArray(planningIds) ? planningIds : planningIds ? [planningIds] : [];

    const response = await deliveryService.confirmReadyDeliveryPlanning({
      planningIds: ids.map((id) => Number(id)),
    });
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//=================================PLANNING DELIVERY=====================================

export const getPlanningDelivery = async (req: Request, res: Response, next: NextFunction) => {
  const { deliveryDate } = req.query as { deliveryDate: string };

  try {
    const response = await deliveryService.getPlanningDelivery(new Date(deliveryDate));
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const createDeliveryPlan = async (req: Request, res: Response, next: NextFunction) => {
  const { deliveryDate, items } = req.body as {
    deliveryDate: Date;
    items: {
      targetType: targetType;
      targetId: number;
      vehicleId: number;
      sequence: number;
    }[];
  };

  try {
    const response = await deliveryService.createDeliveryPlan({ deliveryDate, items });
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
