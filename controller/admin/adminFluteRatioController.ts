import { NextFunction, Request, Response } from "express";
import { adminService } from "../../service/admin/adminService";
import { FluteRatio, FluteRatioCreationAttributes } from "../../models/admin/fluteRatio";

export const getAllFluteRatio = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await adminService.getAllItems({
      model: FluteRatio,
      message: "get all flute ratio successfully",
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const createFluteRatio = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await adminService.createNewItem({
      model: FluteRatio,
      data: req.body as FluteRatioCreationAttributes,
      message: "Create flute ratio successfully",
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const updateFluteRatio = async (req: Request, res: Response, next: NextFunction) => {
  const { fluteRatioId } = req.query as { fluteRatioId: string };

  try {
    const response = await adminService.updateItem({
      model: FluteRatio,
      itemId: Number(fluteRatioId),
      dataUpdated: req.body as FluteRatioCreationAttributes,
      message: "update flute ratio successfully",
      errMessage: "flute ratio not found",
      errCode: "FLUTE_RATIO_NOT_FOUND",
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const deleteFluteRatio = async (req: Request, res: Response, next: NextFunction) => {
  const { fluteRatioId } = req.query as { fluteRatioId: string };

  try {
    const response = await adminService.deleteItem({
      model: FluteRatio,
      itemId: Number(fluteRatioId),
      message: "delete flute ratio successfully",
      errMessage: "flute ratio not found",
      errCode: "FLUTE_RATIO_NOT_FOUND",
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
