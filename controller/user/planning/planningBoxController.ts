import { NextFunction, Request, Response } from "express";
import { planningBoxService } from "../../../service/planning/planningBoxService";
import { statusBoxType } from "../../../models/planning/planningBoxMachineTime";
import { AppError } from "../../../utils/appError";

//get all planning box
export const getPlanningBox = async (req: Request, res: Response, next: NextFunction) => {
  const { machine } = req.query as { machine: string };

  try {
    if (!machine) {
      throw AppError.BadRequest("Missing machine parameter", "MISSING_PARAMETERS");
    }

    const response = await planningBoxService.getPlanningBox(machine);
    return res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

//get by field
export const getPlanningBoxByfield = async (req: Request, res: Response, next: NextFunction) => {
  const { machine, field, keyword } = req.query as {
    machine: string;
    field: string;
    keyword: string;
  };

  try {
    const response = await planningBoxService.getPlanningBoxByField(machine, field, keyword);
    return res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

export const confirmCompleteBox = async (req: Request, res: Response, next: NextFunction) => {
  const { planningBoxIds, machine } = req.body as { planningBoxIds: number[]; machine: string };

  try {
    const response = await planningBoxService.confirmCompletePlanningBox(planningBoxIds, machine);
    return res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

export const acceptLackQtyBox = async (req: Request, res: Response, next: NextFunction) => {
  const { planningBoxIds, newStatus, machine } = req.body as {
    planningBoxIds: number[];
    newStatus: statusBoxType;
    machine: string;
  };

  try {
    if (!Array.isArray(planningBoxIds) || planningBoxIds.length === 0) {
      throw AppError.BadRequest("Missing planningBoxIds parameter", "MISSING_PARAMETERS");
    }

    const response = await planningBoxService.acceptLackQtyBox(planningBoxIds, newStatus, machine);
    return res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

//update index planning
export const updateIndex_TimeRunningBox = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { machine, updateIndex, dayStart, timeStart, totalTimeWorking } = req.body;

  try {
    if (!Array.isArray(updateIndex) || updateIndex.length === 0) {
      throw AppError.BadRequest("Missing updateIndex parameter", "MISSING_PARAMETERS");
    }

    const response = await planningBoxService.updateIndex_TimeRunningBox({
      req,
      machine: machine,
      updateIndex: updateIndex,
      dayStart: dayStart,
      timeStart: timeStart,
      totalTimeWorking: totalTimeWorking,
    });
    return res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};
