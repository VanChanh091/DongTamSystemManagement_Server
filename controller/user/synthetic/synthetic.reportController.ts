import { NextFunction, Request, Response } from "express";
import { syntheticReportsService } from "../../../service/synthetic/synthetic.reportService";

export const getRevenueReport = async (req: Request, res: Response, next: NextFunction) => {
  const { month, year, fromYear, toYear, targetUserId, type, page, pageSize } = req.query as {
    month?: string;
    year?: string;
    fromYear?: string;
    toYear?: string;
    targetUserId?: string;
    type: string;
    page?: string;
    pageSize?: string;
  };

  try {
    let response;

    switch (type) {
      case "daily":
        response = await syntheticReportsService.getDailyRevenueReport({
          month: Number(month),
          year: year ? Number(year) : undefined,
          targetUserId: targetUserId ? Number(targetUserId) : null,
          currentUser: req.user,
          page: Number(page),
          pageSize: Number(pageSize),
        });
        break;
      case "monthly":
        response = await syntheticReportsService.getMonthlyRevenueReport({
          month: Number(month),
          year: year ? Number(year) : undefined,
          targetUserId: targetUserId ? Number(targetUserId) : null,
          currentUser: req.user,
        });
        break;
      case "yearly":
        if (!fromYear || !toYear) {
          throw new Error("Both fromYear and toYear are required for yearly report");
        }

        response = await syntheticReportsService.getMultiYearRevenueReport({
          fromYear: Number(fromYear),
          toYear: Number(toYear),
          targetUserId: targetUserId ? Number(targetUserId) : null,
          currentUser: req.user,
          page: Number(page),
          pageSize: Number(pageSize),
        });
        break;
    }

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
