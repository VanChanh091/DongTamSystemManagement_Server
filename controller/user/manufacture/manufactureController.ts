import { NextFunction, Request, Response } from "express";
import { manufactureService } from "../../../service/manufactureService";
import { AppError } from "../../../utils/appError";

//===============================MANUFACTURE PAPER=====================================

//get planning machine paper
export const getPlanningPaper = async (req: Request, res: Response, next: NextFunction) => {
  const { machine } = req.query as { machine: string };

  try {
    if (!machine) {
      throw AppError.BadRequest("Missing machine parameter", "MISSING_PARAMETERS");
    }

    const response = await manufactureService.getPlanningPaper(machine);
    return res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

//create report for machine
export const addReportPaper = async (req: Request, res: Response, next: NextFunction) => {
  const { planningId } = req.query as { planningId: string };

  try {
    const response = await manufactureService.addReportPaper(
      Number(planningId),
      req.body,
      req.user
    );
    return res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

//confirm producing paper
export const confirmProducingPaper = async (req: Request, res: Response, next: NextFunction) => {
  const { planningId } = req.query as { planningId: string };

  try {
    if (!planningId) {
      throw AppError.BadRequest("Missing planningId parameter", "MISSING_PARAMETERS");
    }

    const response = await manufactureService.confirmProducingPaper(Number(planningId), req.user);
    return res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

//===============================MANUFACTURE BOX=====================================

//get all planning box
export const getPlanningBox = async (req: Request, res: Response, next: NextFunction) => {
  const { machine } = req.query as { machine: string };

  try {
    if (!machine) {
      throw AppError.BadRequest("Missing machine parameter", "MISSING_PARAMETERS");
    }

    const response = await manufactureService.getPlanningBox(machine);
    return res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

//create report for machine
export const addReportBox = async (req: Request, res: Response, next: NextFunction) => {
  const { planningBoxId, machine } = req.query as { planningBoxId: string; machine: string };

  try {
    const response = await manufactureService.addReportBox(
      Number(planningBoxId),
      machine,
      req.body
    );
    return res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

//confirm producing box
export const confirmProducingBox = async (req: Request, res: Response, next: NextFunction) => {
  const { planningBoxId, machine } = req.query as { planningBoxId: string; machine: string };

  try {
    if (!planningBoxId || !machine) {
      throw AppError.BadRequest("Missing planningBoxId parameter", "MISSING_PARAMETERS");
    }

    const response = await manufactureService.confirmProducingBox(
      Number(planningBoxId),
      machine,
      req.user
    );
    return res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

//send request to check quality product
export const updateRequestStockCheck = async (req: Request, res: Response, next: NextFunction) => {
  const { planningBoxId } = req.query as { planningBoxId: string };

  try {
    if (!planningBoxId) {
      throw AppError.BadRequest("Missing planningBoxId parameter", "MISSING_PARAMETERS");
    }

    const response = await manufactureService.updateRequestStockCheck(Number(planningBoxId));
    return res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};
