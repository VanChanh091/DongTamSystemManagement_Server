import {
  WasteNormPaper,
  WasteNormPaperCreationAttributes,
} from "../../models/admin/wasteNormPaper";
import { WasteNormBox, WasteNormBoxCreationAttributes } from "../../models/admin/wasteNormBox";
import { NextFunction, Request, Response } from "express";
import { adminService } from "../../service/admin/adminService";

//===============================WASTE PAPER=====================================

//get all
export const getAllWasteNorm = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await adminService.getAllItems({
      model: WasteNormPaper,
      message: "get all waste successfully",
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//get waste norm by id
//use to get id for update
export const getWasteNormById = async (req: Request, res: Response, next: NextFunction) => {
  const { wasteNormId } = req.query as { wasteNormId: string };

  try {
    const response = await adminService.getItemById({
      model: WasteNormPaper,
      itemId: Number(wasteNormId),
      errMessage: "waste norm not found",
      errCode: "WASTE_NOT_FOUND",
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//add waste norm
export const createWasteNorm = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await adminService.createNewItem({
      model: WasteNormPaper,
      data: req.body as WasteNormPaperCreationAttributes,
      message: "create waste successfully",
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//update waste norm
export const updateWasteNormById = async (req: Request, res: Response, next: NextFunction) => {
  const { wasteNormId } = req.query as { wasteNormId: string };

  try {
    const response = await adminService.updateItem({
      model: WasteNormPaper,
      itemId: Number(wasteNormId),
      dataUpdated: req.body as WasteNormPaperCreationAttributes,
      message: "update waste norm successfully",
      errMessage: "waste norm not found",
      errCode: "WASTE_NOT_FOUND",
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//delete waste norm
export const deleteWasteNormById = async (req: Request, res: Response, next: NextFunction) => {
  const { wasteNormId } = req.query as { wasteNormId: string };

  try {
    const response = await adminService.deleteItem({
      model: WasteNormPaper,
      itemId: Number(wasteNormId),
      message: `delete wasteId: ${wasteNormId} successfully`,
      errMessage: "waste norm not found",
      errCode: "WASTE_NOT_FOUND",
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//===============================WASTE BOX=====================================

export const getAllWasteBox = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await adminService.getAllItems({
      model: WasteNormBox,
      message: "get all waste successfully",
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//get waste norm by id
//use to get id for update
export const getWasteBoxById = async (req: Request, res: Response, next: NextFunction) => {
  const { wasteNormId } = req.query as { wasteNormId: string };

  try {
    const response = await adminService.getItemById({
      model: WasteNormBox,
      itemId: Number(wasteNormId),
      errMessage: "waste norm not found",
      errCode: "WASTE_NOT_FOUND",
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//add waste norm
export const createWasteBox = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await adminService.createNewItem({
      model: WasteNormBox,
      data: req.body as WasteNormBoxCreationAttributes,
      message: "create waste successfully",
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//update waste norm
export const updateWasteBoxById = async (req: Request, res: Response, next: NextFunction) => {
  const { wasteNormId } = req.query as { wasteNormId: string };

  try {
    const response = await adminService.updateItem({
      model: WasteNormBox,
      itemId: Number(wasteNormId),
      dataUpdated: req.body as WasteNormBoxCreationAttributes,
      message: "update waste norm successfully",
      errMessage: "waste norm not found",
      errCode: "WASTE_NOT_FOUND",
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//delete waste norm
export const deleteWasteBoxById = async (req: Request, res: Response, next: NextFunction) => {
  const { wasteNormId } = req.query as { wasteNormId: string };

  try {
    const response = await adminService.deleteItem({
      model: WasteNormBox,
      itemId: Number(wasteNormId),
      message: `delete wasteId: ${wasteNormId} successfully`,
      errMessage: "waste norm not found",
      errCode: "WASTE_NOT_FOUND",
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
