import { AppError } from "../../../utils/appError";
import { OrderStatus } from "../../../models/order/order";
import { NextFunction, Request, Response } from "express";
import { machinePaperType } from "../../../models/planning/planningPaper";
import { planningPaperService } from "../../../service/planning/planningPaperService";

export const getPlanningPapers = async (req: Request, res: Response, next: NextFunction) => {
  const { machine, field, keyword } = req.query as {
    machine: string;
    field: string;
    keyword: string;
  };

  try {
    if (!machine) {
      throw AppError.BadRequest("Missing machine parameter", "MISSING_PARAMETERS");
    }

    let response;
    // 1. Nhánh tìm kiếm theo field
    if (field && keyword) {
      response = await planningPaperService.getPlanningByField(machine, field, keyword);
    }
    // 2. Nhánh lấy tất cả
    else {
      response = await planningPaperService.getPlanningPaperByMachine(machine);
    }

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const handleUpdatePlanningPapers = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { action, planningIds, newMachine, newStatus, rejectReason } = req.body as {
    action: string;
    planningIds: number | number[];
    newMachine?: machinePaperType;
    newStatus?: OrderStatus;
    rejectReason?: string;
  };

  try {
    if (!Array.isArray(planningIds) || planningIds.length === 0 || !action) {
      throw AppError.BadRequest("Missing planningIds or action parameter", "MISSING_PARAMETERS");
    }

    let response;

    switch (action) {
      case "CHANGE_MACHINE":
        if (newMachine) {
          response = await planningPaperService.changeMachinePlanning(planningIds, newMachine);
        }
        break;
      case "CONFIRM_COMPLETE":
        response = await planningPaperService.confirmCompletePlanningPaper(planningIds);
        break;
      case "PAUSE_OR_ACCEPT_LACK":
        if (newStatus) {
          response = await planningPaperService.pauseOrAcceptLackQtyPLanning(
            planningIds,
            newStatus,
            rejectReason,
          );
        }
        break;
      default:
        throw AppError.BadRequest("Invalid action parameter", "INVALID_ACTION");
    }

    return res.status(200).json(response);
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

//socket
export const notifyUpdatePlanning = async (req: Request, res: Response, next: NextFunction) => {
  const { machine, keyName, isPlan } = req.body as {
    machine: string;
    keyName: string;
    isPlan: boolean;
  };

  try {
    const response = await planningPaperService.notifyUpdatePlanning({
      req,
      isPlan,
      machine,
      keyName,
      senderId: (req as any).user?.userId,
    });
    return res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

export const exportExcelPlanningPaper = async (req: Request, res: Response, next: NextFunction) => {
  const { machine } = req.query as { machine: string };

  try {
    const response = await planningPaperService.exportExcelPlanningOrder(res, machine);

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
