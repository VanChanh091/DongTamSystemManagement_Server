import { NextFunction, Request, Response } from "express";
import { inventoryService } from "../../../service/warehouse/inventoryService";

export const getAllInventory = async (req: Request, res: Response, next: NextFunction) => {
  const {
    field,
    keyword,
    page = 1,
    pageSize = 20,
  } = req.query as { field?: string; keyword?: string; page: string; pageSize: string };

  try {
    const response = await inventoryService.getAllInventory({
      field,
      keyword,
      page: Number(page),
      pageSize: Number(pageSize),
    });

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

//export excel
export const exportInventory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await inventoryService.exportExcelInventory(res);
  } catch (error) {
    next(error);
  }
};
