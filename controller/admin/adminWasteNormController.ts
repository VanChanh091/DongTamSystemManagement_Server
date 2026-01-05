import {
  WasteNormPaper,
  WasteNormPaperCreationAttributes,
} from "../../models/admin/wasteNormPaper";
import { WasteNormBox, WasteNormBoxCreationAttributes } from "../../models/admin/wasteNormBox";
import { NextFunction, Request, Response } from "express";
import { adminMachineService } from "../../service/admin/adminMachineService";

//===============================WASTE PAPER=====================================

//get all
export const getAllWasteNorm = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await adminMachineService.getAllWaste(WasteNormPaper);
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
    const response = await adminMachineService.getWasteById(WasteNormPaper, Number(wasteNormId));
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//add waste norm
export const createWasteNorm = async (req: Request, res: Response, next: NextFunction) => {
  const wasteNorm = req.body as WasteNormPaperCreationAttributes;

  try {
    const response = await adminMachineService.createWaste(WasteNormPaper, wasteNorm);
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//update waste norm
export const updateWasteNormById = async (req: Request, res: Response, next: NextFunction) => {
  const { wasteNormId } = req.query as { wasteNormId: string };
  const { ...wasteNormUpdated } = req.body as WasteNormPaperCreationAttributes;

  try {
    const response = await adminMachineService.updateWaste(
      WasteNormPaper,
      Number(wasteNormId),
      wasteNormUpdated
    );
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//delete waste norm
export const deleteWasteNormById = async (req: Request, res: Response, next: NextFunction) => {
  const { wasteNormId } = req.query as { wasteNormId: string };

  try {
    const response = await adminMachineService.deleteWaste(WasteNormPaper, Number(wasteNormId));
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//===============================WASTE BOX=====================================

export const getAllWasteBox = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await adminMachineService.getAllWaste(WasteNormBox);
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
    const response = await adminMachineService.getWasteById(WasteNormBox, Number(wasteNormId));
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//add waste norm
export const createWasteBox = async (req: Request, res: Response, next: NextFunction) => {
  const wasteNorm = req.body as WasteNormBoxCreationAttributes;

  try {
    const response = await adminMachineService.createWaste(WasteNormBox, wasteNorm);
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//update waste norm
export const updateWasteBoxById = async (req: Request, res: Response, next: NextFunction) => {
  const { wasteNormId } = req.query as { wasteNormId: string };
  const { ...wasteNormUpdated } = req.body;

  try {
    const response = await adminMachineService.updateWaste(
      WasteNormBox,
      Number(wasteNormId),
      wasteNormUpdated
    );
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//delete waste norm
export const deleteWasteBoxById = async (req: Request, res: Response, next: NextFunction) => {
  const { wasteNormId } = req.query as { wasteNormId: string };

  try {
    const response = await adminMachineService.deleteWaste(WasteNormBox, Number(wasteNormId));
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
