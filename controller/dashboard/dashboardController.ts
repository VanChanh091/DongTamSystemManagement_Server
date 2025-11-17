import { Request, Response } from "express";
import { dashboardService } from "../../service/dashboardService";

//=============================PAPER===================================

export const getAllDataPaper = async (req: Request, res: Response) => {
  const {
    page,
    pageSize,
    refresh = false,
  } = req.query as { page: string; pageSize: string; refresh: string };

  try {
    const response = await dashboardService.getAllPlaningPaper(
      Number(page),
      Number(pageSize),
      Boolean(refresh)
    );

    return res.status(200).json(response);
  } catch (error: any) {
    return res.status(error.statusCode).json({ message: error.message });
  }
};

//==============================BOX====================================

export const getAllDataBox = async (req: Request, res: Response) => {
  const {
    page = 1,
    pageSize = 20,
    refresh = false,
  } = req.query as { page: string; pageSize: string; refresh: string };

  try {
    const response = await dashboardService.getAllPlaningBox(
      Number(page),
      Number(pageSize),
      Boolean(refresh)
    );

    return res.status(200).json(response);
  } catch (error: any) {
    return res.status(error.statusCode).json({ message: error.message });
  }
};
