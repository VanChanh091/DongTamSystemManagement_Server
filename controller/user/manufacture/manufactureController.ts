import { AppError } from "../../../utils/appError";
import { NextFunction, Request, Response } from "express";
import { manuPaperService } from "../../../service/manufacture/manufacturePaperService";
import { manuBoxService } from "../../../service/manufacture/manufactureBoxService";

//===============================MANUFACTURE PAPER=====================================

//get planning machine paper
export const getPlanningPaper = async (req: Request, res: Response, next: NextFunction) => {
  const { machine, filterType = "all" } = req.query as { machine: string; filterType: string };

  try {
    if (!machine) {
      throw AppError.BadRequest("Missing machine parameter", "MISSING_PARAMETERS");
    }

    const response = await manuPaperService.getPlanningPaper(machine, filterType);
    return res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

//create report for machine
export const addReportPaper = async (req: Request, res: Response, next: NextFunction) => {
  const { planningId } = req.query as { planningId: string };

  try {
    const response = await manuPaperService.addReportPaper(Number(planningId), req.body, req.user);
    return res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

export const updateReportPaper = async (req: Request, res: Response, next: NextFunction) => {
  const { planningId, action } = req.query as { planningId: string | string[]; action: string };

  try {
    if (!planningId || !action) {
      throw AppError.BadRequest("Missing planningId or action parameter", "MISSING_PARAMETERS");
    }

    const idArray = (Array.isArray(planningId) ? planningId : [planningId])
      .map((id) => Number(id))
      .filter((id) => !isNaN(id));

    if (idArray.length === 0) {
      throw AppError.BadRequest("Invalid planningId format", "INVALID_PARAMETERS");
    }

    let response;

    switch (action) {
      case "EDIT_REPORT":
        response = await manuPaperService.updateReportPaper(idArray[0], req.body, req.user);
        break;
      case "REQUEST_COMPLETE":
        response = await manuPaperService.requestCompletePlanningPaper(idArray);
        break;
      default:
        throw AppError.BadRequest("Invalid action parameter", "INVALID_ACTION");
    }

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

    const response = await manuPaperService.confirmProducingPaper(
      req,
      Number(planningId),
      req.user,
    );
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

    const response = await manuBoxService.getPlanningBox(machine);
    return res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

//create report for machine
export const addReportBox = async (req: Request, res: Response, next: NextFunction) => {
  const { planningBoxId, machine } = req.query as { planningBoxId: string; machine: string };

  try {
    const response = await manuBoxService.addReportBox(Number(planningBoxId), machine, req.body);
    return res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

export const updateReportBox = async (req: Request, res: Response, next: NextFunction) => {
  const { planningBoxId, machine, action } = req.query as {
    action: string;
    planningBoxId: string | string[];
    machine: string;
  };

  try {
    if (!planningBoxId || !action) {
      throw AppError.BadRequest("Missing planningBoxId or action parameter", "MISSING_PARAMETERS");
    }

    const idArray = (Array.isArray(planningBoxId) ? planningBoxId : [planningBoxId])
      .map((id) => Number(id))
      .filter((id) => !isNaN(id));

    if (idArray.length === 0) {
      throw AppError.BadRequest("Invalid planningId format", "INVALID_PARAMETERS");
    }

    let response;

    switch (action) {
      case "EDIT_REPORT":
        response = await manuBoxService.updateReportBox(idArray[0], machine, req.body);
        break;
      case "REQUEST_COMPLETE":
        response = await manuBoxService.requestCompletePlanningBox(idArray, machine);
        break;
      default:
        throw AppError.BadRequest("Invalid action parameter", "INVALID_ACTION");
    }

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

    const response = await manuBoxService.confirmProducingBox(
      req,
      Number(planningBoxId),
      machine,
      req.user,
    );
    return res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

//send request to check quality product
export const updateRequestStockCheck = async (req: Request, res: Response, next: NextFunction) => {
  const { planningBoxId, machine } = req.query as { planningBoxId: string; machine: string };

  try {
    if (!planningBoxId) {
      throw AppError.BadRequest("Missing planningBoxId parameter", "MISSING_PARAMETERS");
    }

    const response = await manuBoxService.updateRequestStockCheck(Number(planningBoxId), machine);
    return res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};
