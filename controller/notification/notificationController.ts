import { NextFunction, Request, Response } from "express";
import { notificationService } from "../../service/notification/notificationService";
import { OrderServiceNotification } from "../../service/notification/orderService.notification";
import { planningServiceNotification } from "../../service/notification/planningService.notification";

//=======================NOTIFICATION=======================
export const getMyNofitications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await notificationService.getMyNofitications(req);
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const confirmRequestChanging = async (req: Request, res: Response, next: NextFunction) => {
  const { notificationId } = req.query as { notificationId: string };

  try {
    const response = await notificationService.confirmRequestChanging({
      notificationId: Number(notificationId),
      userId: req.user.userId,
    });
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//=========================ORDER============================
export const requestChangeInfoOrder = async (req: Request, res: Response, next: NextFunction) => {
  const { receiverId } = req.query as { receiverId: string };

  try {
    const response = await OrderServiceNotification.requestChangeInfoOrder({
      req,
      senderId: req.user.userId,
      receiverId: Number(receiverId),
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//========================PLANNING===========================
export const handleRequestChanging = async (req: Request, res: Response, next: NextFunction) => {
  const { notificationId, action } = req.query as {
    notificationId: string;
    action: "approved" | "rejected";
  };

  try {
    const response = await planningServiceNotification.handleRequestChangeInfoOrder({
      req,
      notificationId: Number(notificationId),
      senderId: req.user.userId,
      action,
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
