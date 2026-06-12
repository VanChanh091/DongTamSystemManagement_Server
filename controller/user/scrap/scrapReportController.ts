import { NextFunction, Request, Response } from "express";
import { scrapReportService } from "../../../service/scrapReportService";

export const getAllScrapReports = async (req: Request, res: Response, next: NextFunction) => {
  const { page, pageSize, field, keyword, startDate, endDate, status, machine } = req.query as {
    page: string;
    pageSize: string;
    status: string;
    machine?: string;
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
        status,
        machine: machine!,
      });
    } else if (page && pageSize) {
      response = await scrapReportService.getScrapReportByStatus({
        page: Number(page),
        pageSize: Number(pageSize),
        status,
        machine: machine!,
      });
    } else {
      response = await scrapReportService.getScrapReportWaitingCheck();
    }

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const createScrapReport = async (req: Request, res: Response, next: NextFunction) => {
  const { wasteNormField } = req.body as {
    wasteNormField: {
      machine: string;
      shiftManagement: String;
      dayCompleted: Date;
      shiftProduction: "Ca 1" | "Ca 2" | "Ca 3";
    };
  };

  try {
    const response = await scrapReportService.createScrapReport({
      scrapData: req.body,
      wasteNormField,
    });
    return res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

export const updateScrapReport = async (req: Request, res: Response, next: NextFunction) => {
  const { scrapId, wasteNormField } = req.body as {
    scrapId: number;
    wasteNormField: {
      machine: string;
      shiftManagement: String;
      dayCompleted: Date;
      shiftProduction: "Ca 1" | "Ca 2" | "Ca 3";
    };
  };

  try {
    const response = await scrapReportService.updateScrapReport({
      scrapId,
      updateData: req.body,
      wasteNormField,
    });
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const handleUpdateScrapReport = async (req: Request, res: Response, next: NextFunction) => {
  const { scrapId, status, rejectReason, machine, dayCompleted, shiftProduction, action } =
    req.body as {
      scrapId: number[];
      action: string;
      machine?: string;
      dayCompleted?: Date;
      rejectReason?: string;
      status?: "confirmed" | "rejected";
      shiftProduction?: "Ca 1" | "Ca 2" | "Ca 3";
    };

  try {
    let response;

    switch (action) {
      case "CONFIRM_OR_REJECT":
        response = await scrapReportService.confirmOrRejectScrapReport({
          scrapId,
          status: status!,
          rejectReason,
        });
        break;
      case "ALLOCATE_SCRAP_REPORT":
        response = await scrapReportService.allocateScrapReport({
          scrapId,
          machine: machine!,
          dayCompleted: dayCompleted!,
          shiftProduction: shiftProduction!,
        });
        break;
    }

    return res.status(200).json(response);
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
