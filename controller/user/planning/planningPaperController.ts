import { machinePaperType } from "../../../models/planning/planningPaper";
import { NextFunction, Request, Response } from "express";
import { planningPaperService } from "../../../service/planning/planningPaperService";
import { OrderStatus } from "../../../models/order/order";
import { AppError } from "../../../utils/appError";

//===============================PRODUCTION QUEUE=====================================

//get planning by machine
export const getPlanningByMachine = async (req: Request, res: Response, next: NextFunction) => {
  const { machine } = req.query as { machine: string };

  try {
    if (!machine) {
      throw AppError.BadRequest("Missing machine parameter", "MISSING_PARAMETERS");
    }

    const response = await planningPaperService.getPlanningByMachine(machine);
    return res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

//get planning paper by field
export const getPlanningPaperByfield = async (req: Request, res: Response, next: NextFunction) => {
  const { machine, field, keyword } = req.query as {
    machine: string;
    field: string;
    keyword: string;
  };

  try {
    const response = await planningPaperService.getPlanningByField(machine, field, keyword);
    return res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

//change planning machine
export const changeMachinePlanning = async (req: Request, res: Response, next: NextFunction) => {
  const { planningIds, newMachine } = req.body as {
    planningIds: number[];
    newMachine: machinePaperType;
  };

  try {
    if (!Array.isArray(planningIds) || planningIds.length === 0) {
      throw AppError.BadRequest("Missing planningIds parameter", "MISSING_PARAMETERS");
    }

    const response = await planningPaperService.changeMachinePlanning(planningIds, newMachine);
    return res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

//confirm complete
export const confirmCompletePaper = async (req: Request, res: Response, next: NextFunction) => {
  const { planningIds } = req.body as { planningIds: number[] };

  try {
    const response = await planningPaperService.confirmCompletePlanningPaper(planningIds);
    return res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

//pause or accept lack of qty
export const pauseOrAcceptLackQtyPLanning = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { planningIds, newStatus, rejectReason } = req.body as {
    planningIds: number[];
    newStatus: OrderStatus;
    rejectReason?: string;
  };

  try {
    if (!Array.isArray(planningIds) || planningIds.length === 0) {
      throw AppError.BadRequest("Missing planningIds parameter", "MISSING_PARAMETERS");
    }

    const response = await planningPaperService.pauseOrAcceptLackQtyPLanning(
      planningIds,
      newStatus,
      rejectReason
    );
    return res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

//update index & time running
export const updateIndex_TimeRunning = async (req: Request, res: Response, next: NextFunction) => {
  const { machine, updateIndex, dayStart, timeStart, totalTimeWorking, isNewDay } = req.body as {
    machine: string;
    updateIndex: any[];
    dayStart: string | Date;
    timeStart: string;
    totalTimeWorking: number;
    isNewDay: boolean;
  };

  try {
    if (!Array.isArray(updateIndex) || updateIndex.length === 0) {
      throw AppError.BadRequest("Missing updateIndex parameter", "MISSING_PARAMETERS");
    }

    const response = await planningPaperService.updateIndex_TimeRunning({
      req,
      machine: machine,
      updateIndex: updateIndex,
      dayStart: dayStart,
      timeStart: timeStart,
      totalTimeWorking: totalTimeWorking,
      isNewDay,
    });
    return res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};
