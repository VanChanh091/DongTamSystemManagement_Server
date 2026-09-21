import { NextFunction, Request, Response } from "express";
import { statisticRevenueService } from "../../../service/synthetic/statistic/revenueService";
import { statisticErrProductionService } from "../../../service/synthetic/statistic/errProductionService";

//===========================REVENUE REPORT================================
export const getRevenueReport = async (req: Request, res: Response, next: NextFunction) => {
  const { type, month, year, fromYear, toYear, targetUserId, page, pageSize, keyword, all } =
    req.query as {
      type: string;
      month?: string;
      year?: string;
      fromYear?: string;
      toYear?: string;
      targetUserId?: string;
      page?: string;
      pageSize?: string;
      keyword?: string;
      all?: string;
    };

  try {
    let response;
    const isAll = all === "true";

    switch (type) {
      case "daily":
        response = await statisticRevenueService.getDailyRevenueReport({
          month: Number(month),
          year: year ? Number(year) : undefined,
          targetUserId: targetUserId ? Number(targetUserId) : null,
          currentUser: req.user,
          page: Number(page),
          pageSize: Number(pageSize),
          keyword: keyword ? String(keyword).trim() : undefined,
          all: isAll,
        });
        break;
      case "monthly":
        response = await statisticRevenueService.getMonthlyRevenueReport({
          month: Number(month),
          year: year ? Number(year) : undefined,
          targetUserId: targetUserId ? Number(targetUserId) : null,
          currentUser: req.user,
          all: isAll,
        });
        break;
      case "yearly":
        if (!fromYear || !toYear) {
          throw new Error("Both fromYear and toYear are required for yearly report");
        }

        response = await statisticRevenueService.getMultiYearRevenueReport({
          fromYear: Number(fromYear),
          toYear: Number(toYear),
          targetUserId: targetUserId ? Number(targetUserId) : null,
          currentUser: req.user,
          page: Number(page),
          pageSize: Number(pageSize),
          keyword: keyword ? String(keyword).trim() : undefined,
          all: isAll,
        });
        break;
    }

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//===========================ERROR PRODUCTION REPORT================================
export const getErrorProductionReport = async (req: Request, res: Response, next: NextFunction) => {
  const { action, month, year, machine, employeeId, type } = req.query as {
    action: string;
    month?: string;
    year: string;
    machine?: string;
    employeeId?: string;
    type: "paper" | "box";
  };

  try {
    let response;

    switch (action) {
      case "monthly":
        response = await statisticErrProductionService.getMonthlyErrorReport({
          month: Number(month),
          year: Number(year),
          machine: machine ? String(machine).trim() : undefined,
          employeeId: employeeId ? Number(employeeId) : undefined,
          type: type,
        });
        break;
      case "yearly":
        response = await statisticErrProductionService.getYearlyErrorReport({
          year: Number(year),
          machine: machine ? String(machine).trim() : undefined,
          employeeId: employeeId ? Number(employeeId) : undefined,
          type: type,
        });
        break;
    }

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
