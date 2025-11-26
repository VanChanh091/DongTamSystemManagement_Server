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

//get by field
export const getPlanningBoxByfield = async (req: Request, res: Response) => {
  const { machine, field, keyword } = req.query as {
    machine: string;
    field: string;
    keyword: string;
  };

  try {
    const response = await planningBoxService.getPlanningBoxByField(machine, field, keyword);
    return res.status(201).json(response);
  } catch (error: any) {
    return res.status(error.statusCode).json({ message: error.message });
  }
};

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
