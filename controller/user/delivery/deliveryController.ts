import { AppError } from "../../../utils/appError";
import { NextFunction, Request, Response } from "express";
import { deliveryEstimateService } from "../../../service/delivery/deliveryEstimateService";
import { deliveryPlanningService } from "../../../service/delivery/deliveryPlanningService";
import { deliveryScheduleService } from "../../../service/delivery/deliveryScheduleService";

//=================================PLANNING ESTIMATE TIME=====================================

export const getPlanningEstimateTime = async (req: Request, res: Response, next: NextFunction) => {
  const { page, pageSize, dayStart, estimateTime, all, field, keyword } = req.query as {
    page: string;
    pageSize: string;
    dayStart: string;
    estimateTime: string;
    all: string;
    field?: string;
    keyword?: string;
  };

  try {
    let response;

    const params = {
      page: Number(page),
      pageSize: Number(pageSize),
      dayStart: new Date(dayStart),
      estimateTime,
      userId: req.user.userId,
      all,
    };

    if (field && keyword) {
      response = await deliveryEstimateService.getPlanningEstimateByField({
        ...params,
        field,
        keyword,
      });
    } else {
      response = await deliveryEstimateService.getPlanningEstimateTime(params);
    }

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const handlePutDelivery = async (req: Request, res: Response, next: NextFunction) => {
  const { planningId, qtyRegistered, isPaper, action } = req.body as {
    planningId: number | number[];
    qtyRegistered?: number;
    isPaper?: boolean;
    action: string;
  };

  try {
    let response;

    switch (action) {
      case "REGISTER_QTY":
        response = await deliveryEstimateService.registerQtyDelivery({
          planningId: Number(planningId),
          qtyRegistered: Number(qtyRegistered),
          userId: req.user.userId,
        });
        break;
      case "CLOSE_PLANNING":
        const planningIds = Array.isArray(planningId)
          ? planningId.map(Number)
          : [Number(planningId)];

        response = await deliveryEstimateService.closePlanning({
          planningIds: planningIds,
          isPaper: isPaper || false,
        });
        break;
      default:
        throw AppError.BadRequest("Invalid action parameter", "INVALID_ACTION");
    }

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//=================================DELIVERY REQUEST=====================================

export const getPlanningRequest = async (req: Request, res: Response, next: NextFunction) => {
  const { deliveryDate, field, keyword } = req.query as {
    deliveryDate: string;
    field?: string;
    keyword?: string;
  };

  try {
    let response;

    if (deliveryDate) {
      response = await deliveryPlanningService.getDeliveryPlanDetailForEdit(new Date(deliveryDate));
    } else if (field && keyword) {
      response = await deliveryPlanningService.getDeliveryRequestByField(field, keyword);
    } else {
      response = await deliveryPlanningService.getDeliveryRequest();
    }

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const handlePostDeliveryRequest = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { deliveryDate, items, requestIds } = req.body as {
    deliveryDate: Date;
    items: {
      requestId: number;
      vehicleId: number;
      sequence: string;
      note?: string;
      idxOrder: number;
    }[];
    requestIds: number | number[];
  };

  try {
    let response;

    if (deliveryDate && items) {
      response = await deliveryPlanningService.createDeliveryPlan({ deliveryDate, items });
    } else {
      const ids = Array.isArray(requestIds) ? requestIds.map(Number) : [Number(requestIds)];
      response = await deliveryPlanningService.backDeliveryRequest(ids);
    }

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
    const response = await deliveryPlanningService.confirmForDeliveryPlanning(
      new Date(deliveryDate),
    );
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//=================================DELIVERY SCHEDULE=====================================
export const getAllScheduleDelivery = async (req: Request, res: Response, next: NextFunction) => {
  const { deliveryDate } = req.query as { deliveryDate: string };

  try {
    const response = await deliveryScheduleService.getAllScheduleDelivery(new Date(deliveryDate));
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const getDeliveryItemsByOrderId = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { orderId, all } = req.query as { orderId: string; all: string };

  try {
    let response;

    if (all === "true") {
      response = await deliveryScheduleService.getDeliveryItemsByOrderId(orderId);
    } else {
      response = await deliveryScheduleService.getOneItemByOrderId(orderId);
    }

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
    const response = await deliveryScheduleService.cancelOrCompleteDeliveryPlan({
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
    await deliveryScheduleService.exportScheduleDelivery(res, new Date(deliveryDate));
  } catch (error) {
    next(error);
  }
};

//=================================PREPARE GOODS=====================================
export const getRequestPrepareGoods = async (req: Request, res: Response, next: NextFunction) => {
  const { deliveryDate } = req.query as { deliveryDate: string };

  try {
    const response = await deliveryScheduleService.getRequestPrepareGoods(new Date(deliveryDate));
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
    const response = await deliveryScheduleService.requestOrPrepareGoods(
      Number(deliveryItemId),
      isRequest,
    );

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//socket
export const notifyPrepareGoods = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await deliveryScheduleService.notifyRequestPrepareGoods(req);
    return res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};
