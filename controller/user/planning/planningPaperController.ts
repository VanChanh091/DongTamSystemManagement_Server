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
  const { action, planningIds, newMachine, newStatus, note } = req.body as {
    action: string;
    planningIds: number | number[];
    newMachine?: machinePaperType;
    newStatus?: OrderStatus;
    note?: string;
  };

  try {
    const planningIdsArrs = Array.isArray(planningIds) ? planningIds : [planningIds];

    if (!planningIdsArrs[0] || planningIdsArrs.length === 0 || !action) {
      throw AppError.BadRequest("Missing planningIds or action parameter", "MISSING_PARAMETERS");
    }

    let response;

    switch (action) {
      case "CHANGE_MACHINE":
        if (newMachine) {
          response = await planningPaperService.changeMachinePlanning(planningIdsArrs, newMachine);
        }
        break;
      case "CONFIRM_COMPLETE":
        response = await planningPaperService.confirmCompletePlanningPaper(
          planningIdsArrs,
          req.user.role,
        );
        break;
      case "PAUSE_OR_ACCEPT_LACK":
        if (newStatus) {
          response = await planningPaperService.pauseOrAcceptLackQtyPLanning(
            planningIdsArrs,
            newStatus,
          );
        }
        break;
      case "NOTE":
        if (note) response = await planningPaperService.addNoteToPlanning(planningIdsArrs[0], note);
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
  const { machine, updateIndex, dayStart, timeStart, totalTimeWorking } = req.body as {
    machine: string;
    updateIndex: any[];
    dayStart: string | Date;
    timeStart: string;
    totalTimeWorking: number;
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
