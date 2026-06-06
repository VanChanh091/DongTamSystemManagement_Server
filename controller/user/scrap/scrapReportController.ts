import { NextFunction, Request, Response } from "express";
import { scrapReportService } from "../../../service/scrapReportService";
import { AppError } from "../../../utils/appError";

export const getAllScrapReports = async (req: Request, res: Response, next: NextFunction) => {
  const { page, pageSize, field, keyword, startDate, endDate } = req.query as {
    page: string;
    pageSize: string;
    field?: string;
    keyword?: string;
    startDate?: string;
    endDate?: string;
  };

  try {
    let response;

    if (field && keyword) {
      response = await scrapReportService.getScrapReportByField({
        field,
        keyword,
        page: Number(page),
        pageSize: Number(pageSize),
        startDate,
        endDate,
      });
    } else {
      response = await scrapReportService.getAllScrapReports({
        page: Number(page),
        pageSize: Number(pageSize),
      });
    }

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const createScrapReport = async (req: Request, res: Response, next: NextFunction) => {
  const { empCode, machine, dayCompleted, shiftProduction, qtyWasteNorm } = req.body as {
    empCode: string;
    machine: string;
    dayCompleted: Date;
    shiftProduction: "Ca 1" | "Ca 2" | "Ca 3";
    qtyWasteNorm: number;
  };

  try {
    if (!dayCompleted || !shiftProduction || !qtyWasteNorm || !machine || !empCode) {
      throw AppError.BadRequest("Missing required parameters", "MISSING_PARAMETERS");
    }

    const response = await scrapReportService.createScrapReport({
      empCode,
      machine,
      dayCompleted,
      shiftProduction,
      qtyWasteNorm: Number(qtyWasteNorm),
      scrapData: req.body,
    });
    return res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

export const updateScrapReport = async (req: Request, res: Response, next: NextFunction) => {
  const { scrapId, empCode } = req.body as { scrapId: number; empCode: string };

  try {
    // Implementation for updating scrap report
  } catch (error) {
    next(error);
  }
};

//export excel
export const exportExcelScrapReports = async (req: Request, res: Response, next: NextFunction) => {
  const { fromDate, toDate } = req.body;

  try {
    await scrapReportService.exportExcelScrapReports(res, { fromDate, toDate }, req.user.email);
  } catch (error) {
    next(error);
  }
};
