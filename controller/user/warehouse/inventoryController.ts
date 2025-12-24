import { NextFunction, Request, Response } from "express";
import { inventoryService } from "../../../service/warehouse/inventoryService";

export const getAllInventory = async (req: Request, res: Response, next: NextFunction) => {
  const { page, pageSize } = req.query as { page: string; pageSize: string };

  try {
    const response = await inventoryService.getAllInventory(Number(page), Number(pageSize));
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const createNewInventory = async (req: Request, res: Response, next: NextFunction) => {
  let { orderId } = req.query as { orderId: string };

  try {
    const response = await inventoryService.createNewInventory(orderId);
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
