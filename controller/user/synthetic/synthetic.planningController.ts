import { NextFunction, Request, Response } from "express";
import { syntheticPlanningService } from "../../../service/synthetic/synthetic.planningService";

//get all dashboard planning
export const getSyntheticPlanning = async (req: Request, res: Response, next: NextFunction) => {
  const { field, keyword, page, pageSize, status } = req.query as {
    field?: string;
    keyword?: string;
    page?: string;
    pageSize?: string;
    status?: string;
  };

  try {
    let response;

    if (status) {
      response = await syntheticPlanningService.getAllSyntheticPlanning(
        Number(page),
        Number(pageSize),
        status,
      );
    } else if (field && keyword) {
      response = await syntheticPlanningService.getSyntheticPlanningByFields({
        field,
        keyword,
        page: Number(page),
        pageSize: Number(pageSize),
      });
    } else {
      response = await syntheticPlanningService.getAllSyntheticPlanningStage();
    }

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const getAllSyntheticPlanning = async (req: Request, res: Response, next: NextFunction) => {
  const { page, pageSize, status, planningId } = req.query as {
    page: string;
    pageSize: string;
    refresh: string;
    status: string;
    planningId: string;
  };

  try {
    let response;

    if (planningId) {
      response = await syntheticPlanningService.getSyntheticPlanningDetail(Number(planningId));
    } else {
      response = await syntheticPlanningService.getAllSyntheticPlanning(
        Number(page),
        Number(pageSize),
        status,
      );
    }
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//export excel
export const exportExcelSyntheticPlanning = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    await syntheticPlanningService.exportExcelSyntheticPlanning(req, res);
  } catch (error) {
    next(error);
  }
};
