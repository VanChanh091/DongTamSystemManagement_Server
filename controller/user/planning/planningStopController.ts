import { Request, Response } from "express";
import { planningStopService } from "../../../service/planning/planningStopService";

export const getPlanningStop = async (req: Request, res: Response) => {
  const { page = 1, pageSize = 20 } = req.query as { page?: string; pageSize?: string };
  try {
    const response = await planningStopService.getPlanningStop(Number(page), Number(pageSize));
    return res.status(201).json(response);
  } catch (error: any) {
    return res.status(error.statusCode).json({ message: error.message });
  }
};
