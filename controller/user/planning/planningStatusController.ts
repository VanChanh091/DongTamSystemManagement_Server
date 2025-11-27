import { Request, Response } from "express";
import { planningStatusService } from "../../../service/planning/planningStatusService";

///contain planning order and stop

//===============================PLANNING ORDER=====================================

//getOrderAccept
export const getOrderAccept = async (req: Request, res: Response) => {
  try {
    const response = await planningStatusService.getOrderAccept();

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
    const response = await planningStatusService.planningOrder(orderId, planningData);
    return res.status(201).json(response);
  } catch (error: any) {
    return res.status(error.statusCode).json({ message: error.message });
  }
};

//===============================PLANNING STOP=====================================

export const getPlanningStop = async (req: Request, res: Response) => {
  const { page = 1, pageSize = 20 } = req.query as { page?: string; pageSize?: string };
  try {
    const response = await planningStatusService.getPlanningStop(Number(page), Number(pageSize));
    return res.status(201).json(response);
  } catch (error: any) {
    return res.status(error.statusCode).json({ message: error.message });
  }
};

export const cancelOrContinuePlannning = async (req: Request, res: Response) => {
  const { planningId, action } = req.body as {
    planningId: string | string[];
    action: "cancel" | "continue";
  };

  try {
    const ids = Array.isArray(planningId)
      ? planningId.map((id) => Number(id)) // convert từng phần tử
      : [Number(planningId)];

    const response = await planningStatusService.cancelOrContinuePlannning({
      planningId: ids,
      action,
    });
    return res.status(201).json(response);
  } catch (error: any) {
    return res.status(error.statusCode).json({ message: error.message });
  }
};
