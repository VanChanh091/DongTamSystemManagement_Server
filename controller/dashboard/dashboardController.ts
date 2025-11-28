import { Request, Response } from "express";
import { dashboardService } from "../../service/dashboardService";

//get all dashboard planning
export const getAllDashboardPlanning = async (req: Request, res: Response) => {
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
  } catch (error: any) {
    return res.status(error.statusCode).json({ message: error.message });
  }
};

export const getDbPlanningDetail = async (req: Request, res: Response) => {
  const { planningId } = req.query as { planningId: string };

  try {
    const response = await dashboardService.getDbPlanningDetail(Number(planningId));
    return res.status(200).json(response);
  } catch (error: any) {
    return res.status(error.statusCode).json({ message: error.message });
  }
};

export const getDbPlanningByFields = async (req: Request, res: Response) => {
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
  } catch (error: any) {
    return res.status(error.statusCode).json({ message: error.message });
  }
};

//export excel
export const exportExcelDbPlanning = async (req: Request, res: Response) => {
  try {
    await dashboardService.exportExcelDbPlanning(req, res);
  } catch (error: any) {
    return res.status(error.statusCode).json({ message: error.message });
  }
};

export const getAllDbPlanningStage = async (req: Request, res: Response) => {
  try {
    const response = await dashboardService.getAllDbPlanningStage();
    return res.status(200).json(response);
  } catch (error: any) {
    return res.status(error.statusCode).json({ message: error.message });
  }
};
