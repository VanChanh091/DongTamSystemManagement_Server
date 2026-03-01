import { NextFunction, Request, Response } from "express";
import { planningBoxService } from "../../../service/planning/planningBoxService";
import { statusBoxType } from "../../../models/planning/planningBoxMachineTime";
import { AppError } from "../../../utils/appError";

export const getPlanningBoxes = async (req: Request, res: Response, next: NextFunction) => {
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
      response = await planningBoxService.getPlanningBoxByField(machine, field, keyword);
    }
    // 2. Nhánh lấy tất cả
    else {
      response = await planningBoxService.getPlanningBox(machine);
    }

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//update index planning
export const updateIndex_TimeRunningBox = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
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

    const response = await planningBoxService.updateIndex_TimeRunningBox({
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

export const updatePlanningBoxes = async (req: Request, res: Response, next: NextFunction) => {
  const { planningBoxIds, machine, newStatus, isConfirm } = req.body as {
    planningBoxIds: number[];
    machine: string;
    newStatus?: statusBoxType;
    isConfirm?: boolean;
  };

  try {
    if (!Array.isArray(planningBoxIds) || planningBoxIds.length === 0) {
      throw AppError.BadRequest("Missing planningBoxIds parameter", "MISSING_PARAMETERS");
    }

    let response;

    // 1. Xác nhận sản xuất
    if (isConfirm) {
      response = await planningBoxService.confirmCompletePlanningBox(planningBoxIds, machine);
    }

    // 2. Tạm dừng hoặc chấp nhận thiếu
    else if (newStatus) {
      response = await planningBoxService.acceptLackQtyBox(planningBoxIds, newStatus, machine);
    } else {
      throw AppError.BadRequest("No valid action provided", "INVALID_ACTION");
    }

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
