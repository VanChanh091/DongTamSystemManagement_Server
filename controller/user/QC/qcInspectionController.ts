import { NextFunction, Request, Response } from "express";
import { qcInspectionService } from "../../../service/qualityControl/qcInspectionCheckService";
import { qcCheckPaper } from "../../../models/qualityControl/qcInspection/qcInspectionPaper";
import { qcCheckBox } from "../../../models/qualityControl/qcInspection/qcInspectionBox";

//====================================MANUFACTURE========================================
export const getManufactureToCheck = async (req: Request, res: Response, next: NextFunction) => {
  const { machine, isPaper } = req.query as { machine: string; isPaper: string };

  try {
    let response;

    if (isPaper === "paper") {
      response = await qcInspectionService.getManuPaperToCheck(machine);
    } else if (isPaper === "box") {
      response = await qcInspectionService.getManuBoxToCheck(machine);
    }

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//====================================INSPECTION PAPER========================================
export const getQcInspection = async (req: Request, res: Response, next: NextFunction) => {
  const { page, pageSize, machine, field, keyword, startDate, endDate, isPaper } = req.query;

  try {
    const commonParams = {
      page: Number(page),
      pageSize: Number(pageSize),
      machine: machine as string,
    };
    // const hasSearch = !!(field && keyword);

    const serviceMap = {
      paper: {
        // search: () =>
        //   qcInspectionService.getInspectionPaperByField({
        //     ...commonParams,
        //     field,
        //     keyword,
        //     startDate,
        //     endDate,
        //   } as any),
        all: () => qcInspectionService.getAllQcInspectionPaper(commonParams),
      },
      box: {
        // search: () =>
        //   qcInspectionService.getInspectionBoxByField({
        //     ...commonParams,
        //     field,
        //     keyword,
        //     startDate,
        //     endDate,
        //   } as any),
        all: () => qcInspectionService.getAllQcInspectionBox(commonParams),
      },
    };

    const targetService = serviceMap[isPaper as "paper" | "box"];
    if (!targetService) {
      return res.status(400).json({ message: "isPaper parameter must be 'paper' or 'box'" });
    }

    // const response = hasSearch ? await targetService.search() : await targetService.all();
    const response = await targetService.all();

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//create
export const checkingInspection = async (req: Request, res: Response, next: NextFunction) => {
  const { isPaper } = req.query as { isPaper: string };
  const { checking, errProgress, planningId, boxTimeId, machine } = req.body as {
    checking?: Record<string, number>;
    errProgress: qcCheckPaper | qcCheckBox;
    planningId?: number;
    boxTimeId?: number;
    machine: string;
  };

  try {
    let response;
    if (isPaper === "paper") {
      response = await qcInspectionService.checkingInspectionPaper({
        req,
        machine,
        checking: checking!,
        planningId: planningId!,
        errProgress: errProgress as qcCheckPaper,
        username: req.user.fullName,
      });
    } else if (isPaper === "box") {
      response = await qcInspectionService.checkingInspectionBox({
        req,
        machine,
        boxTimeId: boxTimeId!,
        errProgress: errProgress as qcCheckBox,
        username: req.user.fullName,
      });
    }
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
