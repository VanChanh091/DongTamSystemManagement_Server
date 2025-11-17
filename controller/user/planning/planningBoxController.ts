import { Request, Response } from "express";
import { getPlanningBoxByField } from "../../../utils/helper/modelHelper/planningHelper";
import { planningBoxService } from "../../../service/planning/planningBoxService";
import { statusBoxType } from "../../../models/planning/planningBoxMachineTime";

//get all planning box
export const getPlanningBox = async (req: Request, res: Response) => {
  const { machine } = req.query as { machine: string };

  try {
    const response = await planningBoxService.getPlanningBox(machine);
    return res.status(201).json(response);
  } catch (error: any) {
    return res.status(error.statusCode).json({ message: error.message });
  }
};

//get by orderId
export const getPlanningBoxByOrderId = async (req: Request, res: Response) => {
  const { orderId, machine } = req.query as { orderId: string; machine: string };

  try {
    const response = await planningBoxService.getPlanningBoxByOrderId(machine, orderId);
    return res.status(201).json(response);
  } catch (error: any) {
    return res.status(error.statusCode).json({ message: error.message });
  }
};

//get by customer name
export const getPlanningBoxByCusName = async (req: Request, res: Response) =>
  getPlanningBoxByField(req, res, "customerName");

//get by flute
export const getPlanningBoxByFlute = async (req: Request, res: Response) =>
  getPlanningBoxByField(req, res, "flute");

//get by ghepKho
export const getPlanningBoxByQcBox = async (req: Request, res: Response) =>
  getPlanningBoxByField(req, res, "QC_box");

export const acceptLackQtyBox = async (req: Request, res: Response) => {
  const { planningBoxIds, newStatus, machine } = req.body as {
    planningBoxIds: number[];
    newStatus: statusBoxType;
    machine: string;
  };

  try {
    const response = await planningBoxService.acceptLackQtyBox(planningBoxIds, newStatus, machine);
    return res.status(201).json(response);
  } catch (error: any) {
    return res.status(error.statusCode).json({ message: error.message });
  }
};

//update index planning
export const updateIndex_TimeRunningBox = async (req: Request, res: Response) => {
  const { machine, updateIndex, dayStart, timeStart, totalTimeWorking } = req.body;

  try {
    const response = await planningBoxService.updateIndex_TimeRunningBox({
      req,
      machine: machine,
      updateIndex: updateIndex,
      dayStart: dayStart,
      timeStart: timeStart,
      totalTimeWorking: totalTimeWorking,
    });
    return res.status(201).json(response);
  } catch (error: any) {
    return res.status(error.statusCode).json({ message: error.message });
  }
};
