import { NextFunction, Request, Response } from "express";
import {
  WaveCrestCoefficient,
  WaveCrestCreationAttributes,
} from "../../models/admin/waveCrestCoefficient";
import { adminService } from "../../service/admin/adminService";

export const getWaveCrestCoeff = async (req: Request, res: Response, next: NextFunction) => {
  const { waveCrestId } = req.query as { waveCrestId: string };

  try {
    let response;

    if (waveCrestId) {
      response = await adminService.getItemById({
        model: WaveCrestCoefficient,
        itemId: Number(waveCrestId),
        errMessage: "wave crest not found",
        errCode: "WAVE_CREST_NOT_FOUND",
      });
    } else {
      response = await adminService.getAllItems({
        model: WaveCrestCoefficient,
        message: "get all wave crest coefficient successfully",
      });
    }

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//get all wave crest coefficient //delete
export const getAllWaveCrestCoefficient = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const response = await adminService.getAllItems({
      model: WaveCrestCoefficient,
      message: "get all wave crest coefficient successfully",
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//get wave crest by id //delete
//use to get id for update
export const getWaveCrestById = async (req: Request, res: Response, next: NextFunction) => {
  const { waveCrestId } = req.query as { waveCrestId: string };

  try {
    const response = await adminService.getItemById({
      model: WaveCrestCoefficient,
      itemId: Number(waveCrestId),
      errMessage: "wave crest not found",
      errCode: "WAVE_CREST_NOT_FOUND",
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//add wave crest coefficient
export const createWaveCrestCoefficient = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const response = await adminService.createNewItem({
      model: WaveCrestCoefficient,
      data: req.body as WaveCrestCreationAttributes,
      message: "create wave crest coefficient successfully",
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//update wave crest coefficient
export const updateWaveCrestById = async (req: Request, res: Response, next: NextFunction) => {
  const { waveCrestId } = req.query as { waveCrestId: string };

  try {
    const response = await adminService.updateItem({
      model: WaveCrestCoefficient,
      itemId: Number(waveCrestId),
      dataUpdated: req.body as WaveCrestCreationAttributes,
      message: "update wave crest coefficient successfully",
      errMessage: "wave crest coefficient not found",
      errCode: "WAVE_CREST_COEFF_NOT_FOUND",
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//delete wave crest coefficient
export const deleteWaveCrestById = async (req: Request, res: Response, next: NextFunction) => {
  const { waveCrestId } = req.query as { waveCrestId: string };

  try {
    const response = await adminService.deleteItem({
      model: WaveCrestCoefficient,
      itemId: Number(waveCrestId),
      message: `delete waveCrestCoefficientId: ${waveCrestId} successfully`,
      errMessage: "wave crest coefficient not found",
      errCode: "WAVE_CREST_COEFF_NOT_FOUND",
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
