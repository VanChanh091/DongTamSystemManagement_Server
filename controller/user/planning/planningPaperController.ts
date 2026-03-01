import { machinePaperType } from "../../../models/planning/planningPaper";
import { NextFunction, Request, Response } from "express";
import { planningPaperService } from "../../../service/planning/planningPaperService";
import { OrderStatus } from "../../../models/order/order";
import { AppError } from "../../../utils/appError";

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

export const updatePlanningPapers = async (req: Request, res: Response, next: NextFunction) => {
  const { planningIds, newMachine, newStatus, rejectReason, isConfirm } = req.body as {
    planningIds: number[];
    newMachine?: machinePaperType;
    newStatus?: OrderStatus;
    rejectReason?: string;
    isConfirm?: boolean;
  };

  try {
    if (!Array.isArray(planningIds) || planningIds.length === 0) {
      throw AppError.BadRequest("Missing planningIds parameter", "MISSING_PARAMETERS");
    }

    let response;

    // 1. Đổi máy
    if (newMachine) {
      response = await planningPaperService.changeMachinePlanning(planningIds, newMachine);
    }

    // 2. Xác nhận sản xuất
    else if (isConfirm) {
      response = await planningPaperService.confirmCompletePlanningPaper(planningIds);
    }

    // 3. Tạm dừng hoặc chấp nhận thiếu
    else if (newStatus) {
      response = await planningPaperService.pauseOrAcceptLackQtyPLanning(
        planningIds,
        newStatus,
        rejectReason,
      );
    } else {
      throw AppError.BadRequest("No valid action provided", "INVALID_ACTION");
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

//update index & time running
export const notifyUpdatePlanning = async (req: Request, res: Response, next: NextFunction) => {
  const { machine, keyName, isPlan } = req.body as {
    machine: string;
    keyName: string;
    isPlan: boolean;
  };

  try {
    const response = await planningPaperService.notifyUpdatePlanning(req, isPlan, machine, keyName);
    return res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};
