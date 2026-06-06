import dotenv from "dotenv";
dotenv.config();

import { NextFunction, Request, Response } from "express";
import { reportService } from "../../../service/reportService";

//===============================REPORT PAPER=====================================
export const getReportPapers = async (req: Request, res: Response, next: NextFunction) => {
  const {
    field,
    keyword,
    machine,
    page = 1,
    pageSize = 20,
    startDate,
    endDate,
  } = req.query as {
    field: string;
    keyword: string;
    machine: string;
    page: string;
    pageSize: string;
    startDate?: string;
    endDate?: string;
  };

  try {
    let response;

    // 1. Nhánh tìm kiếm theo field
    if (field && keyword && machine) {
      response = await reportService.getReportPaperByField({
        field,
        keyword,
        machine,
        page: Number(page),
        pageSize: Number(pageSize),
        startDate,
        endDate,
      });
    }
    // 2. Nhánh lấy tất cả
    else {
      response = await reportService.getReportPaper(machine, Number(page), Number(pageSize));
    }

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//===============================REPORT BOX=====================================
export const getReportBoxes = async (req: Request, res: Response, next: NextFunction) => {
  const {
    field,
    keyword,
    machine,
    page = 1,
    pageSize = 20,
    startDate,
    endDate,
  } = req.query as {
    field: string;
    keyword: string;
    machine: string;
    page: string;
    pageSize: string;
    startDate?: string;
    endDate?: string;
  };

  try {
    let response;

    // 1. Nhánh tìm kiếm theo field
    if (field && keyword && machine) {
      response = await reportService.getReportBoxByField({
        field,
        keyword,
        machine,
        page: Number(page),
        pageSize: Number(pageSize),
        startDate,
        endDate,
      });
    }
    // 2. Nhánh lấy tất cả
    else {
      response = await reportService.getReportBox(machine, Number(page), Number(pageSize));
    }

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//===============================EXPORT EXCEL=====================================

//export excel paper
export const exportExcelReportPaper = async (req: Request, res: Response, next: NextFunction) => {
  const { fromDate, toDate, machine } = req.body as {
    fromDate: string | Date;
    toDate: string | Date;
    machine: string;
  };

  try {
    const response = await reportService.exportReportPaper(
      res,
      fromDate,
      toDate,
      machine,
      req.user.email,
    );
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//export excel box
export const exportExcelReportBox = async (req: Request, res: Response, next: NextFunction) => {
  const { fromDate, toDate, machine } = req.body as {
    fromDate: string | Date;
    toDate: string | Date;
    machine: string;
  };

  try {
    const response = await reportService.exportReportBox(
      res,
      fromDate,
      toDate,
      machine,
      req.user.email,
    );
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
