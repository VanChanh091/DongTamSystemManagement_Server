import { NextFunction, Request, Response } from "express";
import { qcCheckBox } from "../../../models/qualityControl/inspection/qcInspectionBox";
import { qcCheckPaper } from "../../../models/qualityControl/inspection/qcInspectionPaper";
import { qcInspectionService } from "../../../service/qualityControl/qcInspectionCheckService";

//====================================INSPECTION PAPER========================================
export const getQcInspection = async (req: Request, res: Response, next: NextFunction) => {
  const { isPaper, page, pageSize, machine, field, keyword } = req.query as {
    isPaper: "paper" | "box";
    page: string;
    pageSize: string;
    machine: string;
    field?: string;
    keyword?: string;
  };

  try {
    const commonParams = {
      page: Number(page),
      pageSize: Number(pageSize),
      machine,
    };
    const hasSearch = !!(field && keyword);

    const serviceMap = {
      paper: {
        search: () =>
          qcInspectionService.getInspectionPaperByField({
            ...commonParams,
            field,
            keyword,
          } as any),
        all: () => qcInspectionService.getAllQcInspectionPaper(commonParams),
      },
      box: {
        search: () =>
          qcInspectionService.getInspectionBoxByField({
            ...commonParams,
            field,
            keyword,
          } as any),
        all: () => qcInspectionService.getAllQcInspectionBox(commonParams),
      },
    };

    const targetService = serviceMap[isPaper];
    if (!targetService) {
      return res.status(400).json({ message: "isPaper parameter must be 'paper' or 'box'" });
    }

    const response = hasSearch ? await targetService.search() : await targetService.all();
    // const response = await targetService.all();

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const getQcInspectionErr = async (req: Request, res: Response, next: NextFunction) => {
  const { planningId, planningBoxId, machine, isPaper } = req.query as {
    planningId?: string;
    planningBoxId?: string;
    machine?: string;
    isPaper: string;
  };

  try {
    let response;

    if (isPaper === "paper") {
      response = await qcInspectionService.getInspectionPaperErr(Number(planningId));
    } else if (isPaper === "box") {
      response = await qcInspectionService.getInspectionBoxErr(Number(planningBoxId), machine!);
    }

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//create
export const checkingInspection = async (req: Request, res: Response, next: NextFunction) => {
  const { isPaper } = req.query as { isPaper: string };
  const { planningId, planningBoxId, checking, errProgress, machine, note, imgErr } = req.body as {
    planningId?: number;
    planningBoxId?: number;
    checking?: Record<string, number>;
    errProgress: qcCheckPaper | qcCheckBox;
    machine: string;
    note?: string;
    imgErr?: string;
  };

  try {
    let response;

    if (isPaper === "paper") {
      response = await qcInspectionService.checkingInspectionPaper({
        req,
        checking: checking!,
        errProgress: errProgress as qcCheckPaper,
        otherData: {
          planningId: planningId!,
          machine,
          note: note,
          imgErr: imgErr,
        },
      });
    } else if (isPaper === "box") {
      response = await qcInspectionService.checkingInspectionBox({
        req,
        errProgress: errProgress as qcCheckBox,
        otherData: {
          planningBoxId: planningBoxId!,
          machine,
          note: note,
          imgErr: imgErr,
        },
      });
    }
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
