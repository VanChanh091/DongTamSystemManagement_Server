import { machinePaperType } from "../../../models/planning/planningPaper";
import { Request, Response } from "express";
import { planningPaperService } from "../../../service/planning/planningPaperService";
import { OrderStatus } from "../../../models/order/order";

//===============================PLANNING ORDER=====================================

//getOrderAccept
export const getOrderAccept = async (req: Request, res: Response) => {
  try {
    const response = await planningPaperService.getOrderAccept();

    return res.status(200).json({
      ...response,
      message: response.fromCache
        ? "get all order have status:accept from cache"
        : "get all order have status:accept",
    });
  } catch (error: any) {
    return res.status(error.statusCode).json({ message: error.message });
  }
};

//planning order
export const planningOrder = async (req: Request, res: Response) => {
  const { orderId } = req.query as { orderId: string };
  const planningData = req.body;

  try {
    const response = await planningPaperService.planningOrder(orderId, planningData);
    return res.status(201).json(response);
  } catch (error: any) {
    return res.status(error.statusCode).json({ message: error.message });
  }
};

//===============================PRODUCTION QUEUE=====================================

//get planning by machine
export const getPlanningByMachine = async (req: Request, res: Response) => {
  const { machine } = req.query as { machine: string };

  try {
    const response = await planningPaperService.getPlanningByMachine(machine);
    return res.status(201).json(response);
  } catch (error: any) {
    return res.status(error.statusCode).json({ message: error.message });
  }
};

//get planning paper by field
export const getPlanningPaperByfield = async (req: Request, res: Response) => {
  const { machine, field, keyword } = req.query as {
    machine: string;
    field: string;
    keyword: string;
  };

  try {
    const response = await planningPaperService.getPlanningByField(machine, field, keyword);
    return res.status(201).json(response);
  } catch (error: any) {
    return res.status(error.statusCode).json({ message: error.message });
  }
};

//change planning machine
export const changeMachinePlanning = async (req: Request, res: Response) => {
  const { planningIds, newMachine } = req.body as {
    planningIds: number[];
    newMachine: machinePaperType;
  };

  try {
    const response = await planningPaperService.changeMachinePlanning(planningIds, newMachine);
    return res.status(201).json(response);
  } catch (error: any) {
    return res.status(error.statusCode).json({ message: error.message });
  }
};

//pause or accept lack of qty
export const pauseOrAcceptLackQtyPLanning = async (req: Request, res: Response) => {
  const { planningIds, newStatus, rejectReason } = req.body as {
    planningIds: number[];
    newStatus: OrderStatus;
    rejectReason?: string;
  };

  try {
    const response = await planningPaperService.pauseOrAcceptLackQtyPLanning(
      planningIds,
      newStatus,
      rejectReason
    );
    return res.status(201).json(response);
  } catch (error: any) {
    return res.status(error.statusCode).json({ message: error.message });
  }
};

//update index & time running
export const updateIndex_TimeRunning = async (req: Request, res: Response) => {
  const { machine, updateIndex, dayStart, timeStart, totalTimeWorking } = req.body as {
    machine: string;
    updateIndex: any[];
    dayStart: string | Date;
    timeStart: string;
    totalTimeWorking: number;
  };

  try {
    const response = await planningPaperService.updateIndex_TimeRunning({
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
