import {
  WasteNormPaper,
  WasteNormPaperCreationAttributes,
} from "../../models/admin/wasteNormPaper";
import { WasteNormBox, WasteNormBoxCreationAttributes } from "../../models/admin/wasteNormBox";
import { NextFunction, Request, Response } from "express";
import { adminService } from "../../service/admin/adminService";

//===============================WASTE PAPER=====================================

export const getWastePapers = async (req: Request, res: Response, next: NextFunction) => {
  const { wasteNormId } = req.query as { wasteNormId: string };

  try {
    let response;

    if (wasteNormId) {
      response = await adminService.getItemById({
        model: WasteNormPaper,
        itemId: Number(wasteNormId),
        errMessage: "waste paper not found",
        errCode: "WASTE_PAPER_NOT_FOUND",
      });
    } else {
      response = await adminService.getAllItems({
        model: WasteNormPaper,
        message: "get all waste papers successfully",
      });
    }

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//add waste norm paper
export const createWastePaper = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await adminService.createNewItem({
      model: WasteNormPaper,
      data: req.body as WasteNormPaperCreationAttributes,
      message: "create waste paper successfully",
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//update waste norm
export const updateWastePaper = async (req: Request, res: Response, next: NextFunction) => {
  const { wasteNormId } = req.query as { wasteNormId: string };

  try {
    const response = await adminService.updateItem({
      model: WasteNormPaper,
      itemId: Number(wasteNormId),
      dataUpdated: req.body as WasteNormPaperCreationAttributes,
      message: "update waste paper successfully",
      errMessage: "waste paper not found",
      errCode: "WASTE_PAPER_NOT_FOUND",
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//delete waste norm
export const deleteWastePaper = async (req: Request, res: Response, next: NextFunction) => {
  const { wasteNormId } = req.query as { wasteNormId: string };

  try {
    const response = await adminService.deleteItem({
      model: WasteNormPaper,
      itemId: Number(wasteNormId),
      message: `delete wasteId: ${wasteNormId} successfully`,
      errMessage: "waste paper not found",
      errCode: "WASTE_PAPER_NOT_FOUND",
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//===============================WASTE BOX=====================================

export const getWasteBoxes = async (req: Request, res: Response, next: NextFunction) => {
  const { wasteNormId } = req.query as { wasteNormId: string };

  try {
    let response;

    if (wasteNormId) {
      response = await adminService.getItemById({
        model: WasteNormBox,
        itemId: Number(wasteNormId),
        errMessage: "waste norm not found",
        errCode: "WASTE_NOT_FOUND",
      });
    } else {
      response = await adminService.getAllItems({
        model: WasteNormBox,
        message: "get all waste successfully",
      });
    }

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//add waste box
export const createWasteBox = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await adminService.createNewItem({
      model: WasteNormBox,
      data: req.body as WasteNormBoxCreationAttributes,
      message: "create waste box successfully",
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//update waste box
export const updateWasteBox = async (req: Request, res: Response, next: NextFunction) => {
  const { wasteNormId } = req.query as { wasteNormId: string };

  try {
    const response = await adminService.updateItem({
      model: WasteNormBox,
      itemId: Number(wasteNormId),
      dataUpdated: req.body as WasteNormBoxCreationAttributes,
      message: "update waste box successfully",
      errMessage: "waste box not found",
      errCode: "WASTE_BOX_NOT_FOUND",
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//delete waste box
export const deleteWasteBox = async (req: Request, res: Response, next: NextFunction) => {
  const { wasteNormId } = req.query as { wasteNormId: string };

  try {
    const response = await adminService.deleteItem({
      model: WasteNormBox,
      itemId: Number(wasteNormId),
      message: `delete wasteId: ${wasteNormId} successfully`,
      errMessage: "waste box not found",
      errCode: "WASTE_BOX_NOT_FOUND",
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
