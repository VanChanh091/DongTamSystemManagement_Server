import { NextFunction, Request, Response } from "express";
import { deliveryService } from "../../../service/deliveryService";

//=================================PLANNING ESTIMATE TIME=====================================

export const getPlanningEstimateTime = async (req: Request, res: Response, next: NextFunction) => {
  const { page, pageSize, dayStart, estimateTime, all } = req.query as {
    page: string;
    pageSize: string;
    dayStart: string;
    estimateTime: string;
    all: string;
  };

  try {
    const response = await deliveryService.getPlanningEstimateTime({
      page: Number(page),
      pageSize: Number(pageSize),
      dayStart: new Date(dayStart),
      estimateTime,
      userId: req.user.userId,
      all,
    });
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const handlePutDelivery = async (req: Request, res: Response, next: NextFunction) => {
  const { planningId, qtyRegistered } = req.body as {
    planningId: number | number[];
    qtyRegistered: string;
  };

  try {
    let response;

    const planningIds = Array.isArray(planningId) ? planningId.map(Number) : [Number(planningId)];

    if (qtyRegistered) {
      response = await deliveryService.registerQtyDelivery({
        planningId: Number(planningId),
        qtyRegistered: Number(qtyRegistered),
        userId: req.user.userId,
      });
    } else {
      response = await deliveryService.closePlanning(planningIds);
    }

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//=================================DELIVERY PLANNING=====================================

export const getPlanningRequest = async (req: Request, res: Response, next: NextFunction) => {
  const { deliveryDate } = req.query as { deliveryDate: string };

  try {
    let response;

    if (deliveryDate) {
      response = await deliveryService.getDeliveryPlanDetailForEdit(new Date(deliveryDate));
    } else {
      response = await deliveryService.getDeliveryRequest();
    }

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const createDeliveryPlan = async (req: Request, res: Response, next: NextFunction) => {
  const { deliveryDate, items } = req.body as {
    deliveryDate: Date;
    items: {
      requestId: number;
      vehicleId: number;
      sequence: string;
      note?: string;
    }[];
  };

  try {
    const response = await deliveryService.createDeliveryPlan({ deliveryDate, items });
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const confirmForDeliveryPlanning = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { deliveryDate } = req.query as { deliveryDate: string };

  try {
    const response = await deliveryService.confirmForDeliveryPlanning(new Date(deliveryDate));
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//=================================SCHEDULE DELIVERY=====================================
export const getAllScheduleDelivery = async (req: Request, res: Response, next: NextFunction) => {
  const { deliveryDate } = req.query as { deliveryDate: string };

  try {
    const response = await deliveryService.getAllScheduleDelivery(new Date(deliveryDate));
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const cancelOrCompleteDeliveryPlan = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { deliveryId } = req.query as { deliveryId: string };
  const { itemIds, action } = req.body as {
    deliveryId: number;
    itemIds: number[];
    action: "complete" | "cancel";
  };

  try {
    const response = await deliveryService.cancelOrCompleteDeliveryPlan({
      deliveryId: Number(deliveryId),
      itemIds,
      action,
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//export excel
export const exportScheduleDelivery = async (req: Request, res: Response, next: NextFunction) => {
  const { deliveryDate } = req.query as { deliveryDate: string };

  try {
    await deliveryService.exportScheduleDelivery(res, new Date(deliveryDate));
  } catch (error) {
    next(error);
  }
};

//=================================PREPARE GOODS=====================================
export const getRequestPrepareGoods = async (req: Request, res: Response, next: NextFunction) => {
  const { deliveryDate } = req.query as { deliveryDate: string };

  try {
    const response = await deliveryService.getRequestPrepareGoods(new Date(deliveryDate));
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const requestOrPrepareGoods = async (req: Request, res: Response, next: NextFunction) => {
  const { deliveryItemId, isRequest } = req.query as {
    deliveryItemId: string;
    isRequest: string;
  };

  try {
    const response = await deliveryService.requestOrPrepareGoods(Number(deliveryItemId), isRequest);

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//socket
export const notifyPrepareGoods = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await deliveryService.notifyRequestPrepareGoods(req);
    return res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};
