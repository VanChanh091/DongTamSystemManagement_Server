import { Request, Response } from "express";
import { adminService } from "../../service/adminService";

//getOrderPending
export const getOrderPending = async (req: Request, res: Response) => {
  try {
    const response = await adminService.getOrderPending();
    return res.status(200).json(response);
  } catch (error: any) {
    return res.status(error.statusCode).json({ message: error.message });
  }
};

//accept or reject order
export const updateStatusAdmin = async (req: Request, res: Response) => {
  const { id } = req.query as { id: string };
  const { newStatus, rejectReason } = req.body;

  try {
    const response = await adminService.updateStatusOrder(id, newStatus, rejectReason);
    return res.status(200).json(response);
  } catch (error: any) {
    return res.status(error.statusCode).json({ message: error.message });
  }
};
