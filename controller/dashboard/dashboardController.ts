import { NextFunction, Request, Response } from "express";
import { dashboardService } from "../../service/dashboardService";

//get all dashboard planning
export const getAllDashboardPlanning = async (req: Request, res: Response, next: NextFunction) => {
  const { page, pageSize, status } = req.query as {
    page: string;
    pageSize: string;
    refresh: string;
    status: string;
  };

  try {
    const response = await dashboardService.getAllDashboardPlanning(
      Number(page),
      Number(pageSize),
      status
    );
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const getDbPlanningDetail = async (req: Request, res: Response, next: NextFunction) => {
  const { planningId } = req.query as { planningId: string };

  try {
    const response = await dashboardService.getDbPlanningDetail(Number(planningId));
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const getDbPlanningByFields = async (req: Request, res: Response, next: NextFunction) => {
  const { field, keyword, page, pageSize } = req.query as {
    field: string;
    keyword: string;
    page: string;
    pageSize: string;
  };

  try {
    const response = await dashboardService.getDbPlanningByFields({
      field,
      keyword,
      page: Number(page),
      pageSize: Number(pageSize),
    });
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//export excel
export const exportExcelDbPlanning = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await dashboardService.exportExcelDbPlanning(req, res);
  } catch (error) {
    next(error);
  }
};

export const getAllDbPlanningStage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await dashboardService.getAllDbPlanningStage();
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
