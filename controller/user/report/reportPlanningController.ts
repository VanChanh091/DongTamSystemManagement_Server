import dotenv from "dotenv";
dotenv.config();
import { Request, Response } from "express";
import { reportService } from "../../../service/reportService";

//===============================REPORT PAPER=====================================

//get all report planning paper
export const getReportPlanningPaper = async (req: Request, res: Response) => {
  const {
    machine,
    page = 1,
    pageSize = 20,
  } = req.query as { machine: string; page?: string; pageSize?: string };

  try {
    const response = await reportService.getReportPaper(machine, Number(page), Number(pageSize));

    return res.status(200).json(response);
  } catch (error: any) {
    return res.status(error.statusCode).json({ message: error.message });
  }
};

//get reported paper by field
export const getReportedPaperByField = async (req: Request, res: Response) => {
  const {
    field,
    keyword,
    machine,
    page = 1,
    pageSize = 20,
  } = req.query as {
    field: string;
    keyword: string;
    machine: string;
    page: string;
    pageSize: string;
  };

  try {
    const response = await reportService.getReportPaperByField(
      field,
      keyword,
      machine,
      Number(page),
      Number(pageSize)
    );

    return res.status(200).json(response);
  } catch (error: any) {
    return res.status(error.statusCode).json({ message: error.message });
  }
};

//===============================REPORT BOX=====================================

//get all report planning box
export const getReportPlanningBox = async (req: Request, res: Response) => {
  const {
    machine,
    page = 1,
    pageSize = 20,
  } = req.query as { machine: string; page: string; pageSize: string };

  try {
    const response = await reportService.getReportBox(machine, Number(page), Number(pageSize));

    return res.status(200).json(response);
  } catch (error: any) {
    return res.status(error.statusCode).json({ message: error.message });
  }
};

//get reported box by field
export const getReportedBoxByField = async (req: Request, res: Response) => {
  const {
    field,
    keyword,
    machine,
    page = 1,
    pageSize = 20,
  } = req.query as {
    field: string;
    keyword: string;
    machine: string;
    page: string;
    pageSize: string;
  };

  try {
    const response = await reportService.getReportBoxByField(
      field,
      keyword,
      machine,
      Number(page),
      Number(pageSize)
    );

    return res.status(200).json(response);
  } catch (error: any) {
    return res.status(error.statusCode).json({ message: error.message });
  }
};

//===============================EXPORT EXCEL=====================================

//export excel paper
export const exportExcelReportPaper = async (req: Request, res: Response) => {
  const { fromDate, toDate, reportPaperId, machine } = req.body as {
    fromDate: string | Date;
    toDate: string | Date;
    reportPaperId: number[];
    machine: string;
  };

  try {
    const response = await reportService.exportReportPaper(
      res,
      fromDate,
      toDate,
      reportPaperId,
      machine
    );

    return res.status(200).json(response);
  } catch (error: any) {
    return res.status(error.statusCode).json({ message: error.message });
  }
};

//export excel box
export const exportExcelReportBox = async (req: Request, res: Response) => {
  const { fromDate, toDate, reportBoxId, machine } = req.body as {
    fromDate: string | Date;
    toDate: string | Date;
    reportBoxId: number[];
    machine: string;
  };

  try {
    const response = await reportService.exportReportBox(
      res,
      fromDate,
      toDate,
      reportBoxId,
      machine
    );

    return res.status(200).json(response);
  } catch (error: any) {
    return res.status(error.statusCode).json({ message: error.message });
  }
};
