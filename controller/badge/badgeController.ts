import { AppError } from "../../utils/appError";
import { Order } from "../../models/order/order";
import { NextFunction, Request, Response } from "express";
import { ScrapReport } from "../../models/scrap/scrapReport";
import { DeliveryItem } from "../../models/delivery/deliveryItem";
import { PlanningPaper } from "../../models/planning/planningPaper";
import { DeliveryRequest } from "../../models/delivery/deliveryRequest";
import { warehouseRepository } from "../../repository/warehouseRepository";
import { DebtDeductionRequest } from "../../models/debt/debtDeductionRequest";

//pending order
export const countOrderPending = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await Order.count({ where: { status: "pending" } });
    return res.status(201).json({ message: "Count order pending successfully", data: response });
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
    const response = await Order.count({ where: { status: "accept" } });
    return res
      .status(201)
      .json({ message: "Count order pending planning successfully", data: response });
  } catch (error) {
    next(error);
  }
};

//planning stop
export const countPlanningStop = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await PlanningPaper.count({ where: { status: "stop" } });
    return res.status(201).json({ message: "Count planning stop successfully", data: response });
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
      const data = await warehouseRepository.getPaperWaitingChecked();
      response = data.length;
    } else if (type === "box") {
      const data = await warehouseRepository.getBoxWaitingChecked();
      response = data.length;
    } else if (type === "scrap") {
      response = await ScrapReport.count({ where: { status: "pending" } });
    } else {
      throw AppError.BadRequest(
        "Invalid type query parameter. Must be 'paper', 'box', or 'scrap'.",
      );
    }

    return res
      .status(201)
      .json({ message: `Count waiting check ${type} successfully`, data: response });
  } catch (error) {
    next(error);
  }
};

//delivery request
export const countDeliveryRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await DeliveryRequest.count({ where: { status: "requested" } });
    return res.status(201).json({ message: "Count delivery request successfully", data: response });
  } catch (error) {
    next(error);
  }
};

//prepare goods
export const countRequestPrepareGoods = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await DeliveryItem.count({ where: { status: "requested" } });
    return res.status(201).json({ message: "Count prepare goods successfully", data: response });
  } catch (error) {
    next(error);
  }
};

export const countDebtDeduction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await DebtDeductionRequest.count({ where: { status: "pending" } });
    return res.status(201).json({ message: "Count debt deduction successfully", data: response });
  } catch (error) {
    next(error);
  }
};
