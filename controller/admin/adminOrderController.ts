import { NextFunction, Request, Response } from "express";
import { adminService } from "../../service/admin/adminService";

//getOrderPending
export const getOrderPending = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await adminService.getOrderPending();
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//accept or reject order
export const updateStatusAdmin = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.query as { id: string };
  const { newStatus, rejectReason } = req.body;

  try {
    const response = await adminService.updateStatusOrder(id, newStatus, rejectReason);
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
