import { NextFunction, Request, Response } from "express";
import { actionPlanService } from "../../service/admin/actionPlanService";

export const getYearlyActionPlan = async (req: Request, res: Response, next: NextFunction) => {
  const year = Number(req.query.year) || new Date().getFullYear();

  try {
    const result = await actionPlanService.getYearlyActionPlan({ year });
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const saveYearlyTargets = async (req: Request, res: Response, next: NextFunction) => {
  const { year, targets } = req.body;

  try {
    const result = await actionPlanService.saveYearlyTargets({
      year: Number(year),
      targetsList: targets,
      updatedBy: req.user.fullName,
    });
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const triggerDebtSnapshot = async (req: Request, res: Response, next: NextFunction) => {
  const { year, month, closingDay, snapshotDate } = {
    ...req.query,
    ...req.body,
  };

  try {
    const result = await actionPlanService.captureDebtSnapshot({
      snapshotDate: snapshotDate ? new Date(snapshotDate as string) : new Date(),
      year: year ? Number(year) : undefined,
      month: month ? Number(month) : undefined,
      closingDay: closingDay ? Number(closingDay) : undefined,
      isCron: false,
    });
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
