import dotenv from "dotenv";
dotenv.config();
import { Request, Response } from "express";
import { manufactureService } from "../../../service/manufactureService";

//===============================MANUFACTURE PAPER=====================================

//get planning machine paper
export const getPlanningPaper = async (req: Request, res: Response) => {
  const { machine } = req.query as { machine: string };

  try {
    const response = await manufactureService.getPlanningPaper(machine);
    return res.status(201).json(response);
  } catch (error: any) {
    return res.status(error.statusCode).json({ message: error.message });
  }
};

//create report for machine
export const addReportPaper = async (req: Request, res: Response) => {
  const { planningId } = req.query as { planningId: string };

  try {
    const response = await manufactureService.addReportPaper(
      Number(planningId),
      req.body,
      req.user
    );
    return res.status(201).json(response);
  } catch (error: any) {
    return res.status(error.statusCode).json({ message: error.message });
  }
};

//confirm producing paper
export const confirmProducingPaper = async (req: Request, res: Response) => {
  const { planningId } = req.query as { planningId: string };

  try {
    const response = await manufactureService.confirmProducingPaper(Number(planningId), req.user);
    return res.status(201).json(response);
  } catch (error: any) {
    return res.status(error.statusCode).json({ message: error.message });
  }
};

//===============================MANUFACTURE BOX=====================================

//get all planning box
export const getPlanningBox = async (req: Request, res: Response) => {
  const { machine } = req.query as { machine: string };

  try {
    const response = await manufactureService.getPlanningBox(machine);
    return res.status(201).json(response);
  } catch (error: any) {
    return res.status(error.statusCode).json({ message: error.message });
  }
};

//create report for machine
export const addReportBox = async (req: Request, res: Response) => {
  const { planningBoxId, machine } = req.query as { planningBoxId: string; machine: string };

  try {
    const response = await manufactureService.addReportBox(
      Number(planningBoxId),
      machine,
      req.body
    );
    return res.status(201).json(response);
  } catch (error: any) {
    return res.status(error.statusCode).json({ message: error.message });
  }
};

//confirm producing box
export const confirmProducingBox = async (req: Request, res: Response) => {
  const { planningBoxId, machine } = req.query as { planningBoxId: string; machine: string };

  try {
    const response = await manufactureService.confirmProducingBox(
      Number(planningBoxId),
      machine,
      req.user
    );
    return res.status(201).json(response);
  } catch (error: any) {
    return res.status(error.statusCode).json({ message: error.message });
  }
};
